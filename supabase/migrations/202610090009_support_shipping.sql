begin;

-- Staff chat is separate from legacy private FAQ history. Only newly sent
-- support messages are shared with staff; old private histories stay private.
create table public.support_threads (
  user_id uuid primary key references auth.users(id) on delete cascade,
  resolved boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.support_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.support_threads(user_id) on delete cascade,
  sender text not null check (sender in ('customer','staff')),
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index support_messages_thread on public.support_messages(user_id,id);
alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_threads,public.support_messages from public,anon,authenticated,service_role;
grant select on public.support_threads,public.support_messages to authenticated;
grant update(resolved) on public.support_threads to authenticated;
grant all on public.support_threads,public.support_messages to service_role;
grant usage,select on sequence public.support_messages_id_seq to service_role;
create policy support_threads_read on public.support_threads for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy support_threads_update on public.support_threads for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy support_messages_read on public.support_messages for select to authenticated using (user_id=auth.uid() or public.is_admin());

create function public.send_support_message(p_body text, p_user_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  target uuid := coalesce(p_user_id, auth.uid());
  actor uuid := auth.uid();
  staff boolean := p_user_id is not null and public.is_admin();
  message public.support_messages%rowtype;
begin
  if actor is null or target is null or (p_user_id is not null and not staff) then raise exception 'INVALID_REQUEST'; end if;
  if p_body is null or length(btrim(p_body)) not between 1 and 4000 then raise exception 'INVALID_REQUEST'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('support:' || target::text,0));
  if (select count(*) from public.support_messages where user_id=target and created_at > now()-interval '1 minute') >= 20 then raise exception 'TOO_MANY_REQUESTS'; end if;
  insert into public.support_threads(user_id,resolved,updated_at) values(target,false,now())
    on conflict(user_id) do update set resolved=false,updated_at=now();
  insert into public.support_messages(user_id,sender,body) values(target,case when staff then 'staff' else 'customer' end,btrim(p_body)) returning * into message;
  return to_jsonb(message);
end;
$$;
revoke all on function public.send_support_message(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.send_support_message(text,uuid) to authenticated;

alter table public.site_settings add column shipping_zones jsonb not null default '[]'::jsonb
  check (jsonb_typeof(shipping_zones)='array' and jsonb_array_length(shipping_zones)<=50);
create function public.validate_shipping_zones() returns trigger
language plpgsql set search_path = '' as $$
declare zone jsonb;
begin
  for zone in select value from jsonb_array_elements(new.shipping_zones) loop
    if jsonb_typeof(zone)<>'object' or coalesce(length(btrim(zone->>'name')),0) not between 1 and 100
      or coalesce(length(btrim(zone->>'province')),0) not between 1 and 100
      or coalesce(jsonb_typeof(zone->'wards'),'')<>'array' or jsonb_array_length(zone->'wards')>200
      or coalesce(zone->>'fee','') !~ '^[0-9]{1,9}$' or (zone->>'fee')::bigint > 100000000
      or exists(select 1 from jsonb_array_elements(zone->'wards') w where jsonb_typeof(w)<>'string' or length(btrim(w#>>'{}')) not between 1 and 100)
    then raise exception 'INVALID_REQUEST'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.validate_shipping_zones() from public,anon,authenticated,service_role;
create trigger shipping_zone_validation before insert or update of shipping_zones on public.site_settings for each row execute function public.validate_shipping_zones();

create function public.quote_shipping_fee(p_customer jsonb) returns bigint
language sql stable security definer set search_path = '' as $$
  select coalesce((select (zone->>'fee')::bigint
    from jsonb_array_elements(settings.shipping_zones) with ordinality zones(zone,position)
    where lower(btrim(zone->>'province'))=lower(btrim(p_customer->>'city'))
      and (jsonb_array_length(zone->'wards')=0 or exists(select 1 from jsonb_array_elements_text(zone->'wards') ward where lower(btrim(ward))=lower(btrim(p_customer->>'ward'))))
    order by (jsonb_array_length(zone->'wards')>0) desc,position asc limit 1),settings.shipping_fee)
  from public.site_settings settings where id=true;
$$;
revoke all on function public.quote_shipping_fee(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.quote_shipping_fee(jsonb) to service_role;

-- Retain every variant, voucher, idempotency and stock guarantee in migration
-- 007; replace only the shipping source with the server's address-zone quote.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text)'::regprocedure) into definition;
  if position('payment_settings.shipping_fee' in definition)=0 then raise exception 'create_order shipping source changed; review migration'; end if;
  execute replace(definition,'payment_settings.shipping_fee','public.quote_shipping_fee(p_customer)');
end;
$$;
notify pgrst, 'reload schema';
commit;
