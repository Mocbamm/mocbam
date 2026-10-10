begin;

create table public.voucher_email_campaigns (
  id uuid primary key,
  discount_id uuid not null references public.discounts(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  subject text not null check (length(btrim(subject)) between 1 and 200 and subject !~ E'[\\r\\n]'),
  body text not null check (length(btrim(body)) between 1 and 10000),
  created_at timestamptz not null default now()
);
create index voucher_email_campaign_discount on public.voucher_email_campaigns(discount_id,created_at desc);

create table public.voucher_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.voucher_email_campaigns(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null check (length(recipient_email) between 3 and 254),
  recipient_name text not null default '',
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','unknown')),
  error_message text not null default '' check (length(error_message) <= 500),
  attempted_at timestamptz,
  sent_at timestamptz,
  unique(campaign_id,recipient_user_id)
);
create index voucher_email_delivery_campaign on public.voucher_email_deliveries(campaign_id);
alter table public.voucher_email_campaigns enable row level security;
alter table public.voucher_email_deliveries enable row level security;
revoke all on public.voucher_email_campaigns,public.voucher_email_deliveries from anon,authenticated;
grant select on public.voucher_email_campaigns,public.voucher_email_deliveries to authenticated;
grant all on public.voucher_email_campaigns,public.voucher_email_deliveries to service_role;
create policy voucher_email_campaign_admin_read on public.voucher_email_campaigns for select to authenticated using(public.is_admin());
create policy voucher_email_delivery_admin_read on public.voucher_email_deliveries for select to authenticated using(public.is_admin());

create function public.prepare_voucher_email(
  p_id uuid,p_discount_id uuid,p_admin_id uuid,p_payload_hash text,
  p_subject text,p_body text,p_recipient_user_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing public.voucher_email_campaigns%rowtype;
  voucher public.discounts%rowtype;
begin
  if not exists(select 1 from public.admin_members where user_id=p_admin_id) then raise exception 'EMAIL_ADMIN_REQUIRED'; end if;
  if p_id is null or p_discount_id is null or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_subject is null or length(btrim(p_subject)) not between 1 and 200 or p_subject ~ E'[\\r\\n]'
    or p_body is null or length(btrim(p_body)) not between 1 and 10000
    or p_recipient_user_ids is null or cardinality(p_recipient_user_ids) not between 1 and 50
    or exists(select 1 from unnest(p_recipient_user_ids) selected where selected is null)
    or (select count(distinct selected) from unnest(p_recipient_user_ids) selected) <> cardinality(p_recipient_user_ids)
    then raise exception 'INVALID_REQUEST'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text, 1));
  select * into existing from public.voucher_email_campaigns where id=p_id;
  if found then
    if existing.discount_id <> p_discount_id or existing.requested_by is distinct from p_admin_id or existing.payload_hash <> p_payload_hash
      then raise exception 'EMAIL_IDEMPOTENCY_CONFLICT'; end if;
  end if;
  select * into voucher from public.discounts where id=p_discount_id for share;
  if not found or voucher.scope <> 'private' then raise exception 'EMAIL_PRIVATE_REQUIRED'; end if;
  if not voucher.active or (voucher.ends_at is not null and voucher.ends_at <= clock_timestamp())
    or (voucher.max_uses is not null and voucher.used_count >= voucher.max_uses)
    then raise exception 'DISCOUNT_UNAVAILABLE'; end if;
  if exists(select 1 from unnest(p_recipient_user_ids) selected
    where not (selected=any(voucher.customer_user_ids) or selected is not distinct from voucher.customer_user_id))
    then raise exception 'EMAIL_RECIPIENT_NOT_ELIGIBLE'; end if;
  -- Resolve trusted, verified login addresses from auth, never editable profile
  -- email fields or addresses supplied by the browser.
  if (select count(*) from auth.users where id=any(p_recipient_user_ids)
    and email_confirmed_at is not null and length(email) between 3 and 254) <> cardinality(p_recipient_user_ids)
    then raise exception 'EMAIL_RECIPIENT_UNVERIFIED'; end if;
  if existing.id is not null then
    if exists(select 1 from public.voucher_email_deliveries deliveries
      join auth.users on users.id=deliveries.recipient_user_id
      where deliveries.campaign_id=existing.id and lower(users.email)<>deliveries.recipient_email)
      then raise exception 'EMAIL_RECIPIENT_CHANGED'; end if;
    return existing.id;
  end if;
  insert into public.voucher_email_campaigns(id,discount_id,requested_by,payload_hash,subject,body)
    values(p_id,p_discount_id,p_admin_id,p_payload_hash,btrim(p_subject),btrim(p_body));
  insert into public.voucher_email_deliveries(campaign_id,recipient_user_id,recipient_email,recipient_name)
    select p_id,users.id,lower(users.email),coalesce(profiles.full_name,'')
    from auth.users left join public.profiles on profiles.id=users.id where users.id=any(p_recipient_user_ids);
  return p_id;
end;
$$;
revoke all on function public.prepare_voucher_email(uuid,uuid,uuid,text,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.prepare_voucher_email(uuid,uuid,uuid,text,text,text,uuid[]) to service_role;

commit;
