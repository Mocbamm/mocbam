begin;

create table public.inquiry_email_replies (
  id uuid primary key,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  payload_hash text not null check(payload_hash ~ '^[a-f0-9]{64}$'),
  recipient_email text not null check(length(recipient_email) between 3 and 254),
  subject text not null check(length(btrim(subject)) between 1 and 200 and subject !~ E'[\\r\\n]'),
  body text not null check(length(btrim(body)) between 1 and 10000),
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','unknown')),
  error_message text not null default '' check(length(error_message)<=500),
  created_at timestamptz not null default now(),
  attempted_at timestamptz,
  sent_at timestamptz
);
create index inquiry_email_reply_history on public.inquiry_email_replies(inquiry_id,created_at desc);
alter table public.inquiry_email_replies enable row level security;
revoke all on public.inquiry_email_replies from public,anon,authenticated;
grant select on public.inquiry_email_replies to authenticated;
grant all on public.inquiry_email_replies to service_role;
create policy inquiry_email_admin_read on public.inquiry_email_replies for select to authenticated using(public.is_admin());

create function public.prepare_inquiry_email(
  p_id uuid,p_inquiry_id uuid,p_admin_id uuid,p_payload_hash text,p_subject text,p_body text
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  existing public.inquiry_email_replies%rowtype;
  inquiry public.inquiries%rowtype;
begin
  if not exists(select 1 from public.admin_members where user_id=p_admin_id) then raise exception 'EMAIL_ADMIN_REQUIRED'; end if;
  if p_id is null or p_inquiry_id is null or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
    or p_subject is null or length(btrim(p_subject)) not between 1 and 200 or p_subject ~ E'[\\r\\n]'
    or p_body is null or length(btrim(p_body)) not between 1 and 10000 then raise exception 'INVALID_REQUEST'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,2));
  select * into existing from public.inquiry_email_replies where id=p_id;
  if found then
    if existing.inquiry_id<>p_inquiry_id or existing.requested_by is distinct from p_admin_id or existing.payload_hash<>p_payload_hash
      then raise exception 'EMAIL_IDEMPOTENCY_CONFLICT'; end if;
    return existing.id;
  end if;
  select * into inquiry from public.inquiries where id=p_inquiry_id for share;
  if not found then raise exception 'EMAIL_INQUIRY_NOT_FOUND'; end if;
  if inquiry.email is null or length(btrim(inquiry.email)) not between 3 and 254 or inquiry.email ~ E'[\\r\\n]'
    then raise exception 'EMAIL_INQUIRY_ADDRESS_INVALID'; end if;
  insert into public.inquiry_email_replies(id,inquiry_id,requested_by,payload_hash,recipient_email,subject,body)
    values(p_id,p_inquiry_id,p_admin_id,p_payload_hash,lower(btrim(inquiry.email)),btrim(p_subject),btrim(p_body));
  return p_id;
end;
$$;
revoke all on function public.prepare_inquiry_email(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.prepare_inquiry_email(uuid,uuid,uuid,text,text,text) to service_role;
notify pgrst,'reload schema';

commit;
