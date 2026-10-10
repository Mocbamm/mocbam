begin;
alter table public.site_settings
  add column shipping_distance_enabled boolean not null default false,
  add column shipping_origin_address text not null default '' check(length(shipping_origin_address)<=500),
  add column shipping_distance_bands jsonb not null default '[]'::jsonb;
create function public.validate_shipping_distance() returns trigger language plpgsql set search_path='' as $$
declare band jsonb; previous numeric:=0; km numeric;
begin
  if jsonb_typeof(new.shipping_distance_bands)<>'array' or jsonb_array_length(new.shipping_distance_bands)>50 then raise exception 'INVALID_REQUEST'; end if;
  for band in select value from jsonb_array_elements(new.shipping_distance_bands) loop
    if jsonb_typeof(band)<>'object' or coalesce(band->>'up_to_km','') !~ '^[0-9]{1,4}(\.[0-9]{1,3})?$'
      or coalesce(band->>'fee','') !~ '^[0-9]{1,9}$' then raise exception 'INVALID_REQUEST'; end if;
    km:=(band->>'up_to_km')::numeric;
    if km<=previous or km>3000 or (band->>'fee')::bigint>100000000 then raise exception 'INVALID_REQUEST'; end if;
    previous:=km;
  end loop;
  if new.shipping_distance_enabled and (length(btrim(new.shipping_origin_address))=0 or jsonb_array_length(new.shipping_distance_bands)=0) then raise exception 'INVALID_REQUEST'; end if;
  return new;
end;
$$;
revoke all on function public.validate_shipping_distance() from public,anon,authenticated,service_role;
create trigger shipping_distance_validation before insert or update of shipping_distance_enabled,shipping_origin_address,shipping_distance_bands on public.site_settings for each row execute function public.validate_shipping_distance();
create function public.shipping_address_key(p_customer jsonb) returns jsonb language sql immutable set search_path='' as $$
  select jsonb_build_object('address',lower(btrim(p_customer->>'address')),'city',lower(btrim(p_customer->>'city')),'ward',lower(btrim(coalesce(p_customer->>'ward',''))));
$$;
create function public.shipping_configuration() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',shipping_distance_enabled,'origin',shipping_origin_address,'bands',shipping_distance_bands,'zones',shipping_zones,'fee',shipping_fee) from public.site_settings where id=true;
$$;
create table public.shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  address_key jsonb not null,
  configuration jsonb not null,
  distance_meters integer not null check(distance_meters between 0 and 10000000),
  fee bigint not null check(fee between 0 and 100000000),
  name text not null,
  expires_at timestamptz not null default now()+interval '15 minutes',
  created_at timestamptz not null default now()
);
create index shipping_quotes_expiry on public.shipping_quotes(expires_at);
create table public.shipping_request_limits(key text primary key,window_start timestamptz not null,requests integer not null);
alter table public.shipping_quotes enable row level security;
alter table public.shipping_request_limits enable row level security;
revoke all on public.shipping_quotes,public.shipping_request_limits from public,anon,authenticated,service_role;
grant all on public.shipping_quotes,public.shipping_request_limits to service_role;
create function public.reserve_shipping_request(p_key text) returns boolean language plpgsql security definer set search_path='' as $$
declare total integer;
begin
  if p_key !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REQUEST'; end if;
  insert into public.shipping_request_limits(key,window_start,requests) values(p_key,date_trunc('minute',now()),1)
    on conflict(key) do update set window_start=date_trunc('minute',now()),requests=case when shipping_request_limits.window_start=date_trunc('minute',now()) then shipping_request_limits.requests+1 else 1 end returning requests into total;
  delete from public.shipping_request_limits where window_start<now()-interval '1 day';
  return total<=10;
end;
$$;
create function public.create_shipping_quote(p_customer jsonb,p_distance_meters integer,p_origin_address text) returns jsonb language plpgsql security definer set search_path='' as $$
declare settings public.site_settings%rowtype; band jsonb; zone jsonb; amount bigint; label text; quote public.shipping_quotes%rowtype;
begin
  select * into settings from public.site_settings where id=true for share;
  if not found or not settings.shipping_distance_enabled or p_distance_meters is null or p_distance_meters not between 0 and 10000000
    or coalesce(length(btrim(p_customer->>'address')),0) not between 1 and 500
    or coalesce(length(btrim(p_customer->>'city')),0) not between 1 and 100
    or coalesce(length(btrim(p_customer->>'ward')),0) not between 1 and 100 then raise exception 'INVALID_REQUEST'; end if;
  -- Google calculated the route from this trusted server-side origin. An admin
  -- may have changed it while that request was in flight; never certify the old
  -- route against a new configuration.
  if p_origin_address is distinct from settings.shipping_origin_address then raise exception 'SHIPPING_QUOTE_EXPIRED'; end if;
  select value into band from jsonb_array_elements(settings.shipping_distance_bands) with ordinality b(value,position) where (value->>'up_to_km')::numeric*1000>=p_distance_meters order by position limit 1;
  if band is not null then
    amount:=(band->>'fee')::bigint; label:='Khoảng cách đến ' || (band->>'up_to_km') || ' km';
  else
    select value into zone from jsonb_array_elements(settings.shipping_zones) with ordinality z(value,position)
      where lower(btrim(value->>'province'))=lower(btrim(p_customer->>'city'))
      and (jsonb_array_length(value->'wards')=0 or exists(select 1 from jsonb_array_elements_text(value->'wards') ward where lower(btrim(ward))=lower(btrim(p_customer->>'ward'))))
      order by (jsonb_array_length(value->'wards')>0) desc,position limit 1;
    amount:=coalesce((zone->>'fee')::bigint,settings.shipping_fee); label:=coalesce(zone->>'name','Phí giao hàng tiêu chuẩn') || ' (ngoài các mốc km)';
  end if;
  delete from public.shipping_quotes where expires_at<now()-interval '1 day';
  insert into public.shipping_quotes(address_key,configuration,distance_meters,fee,name)
    values(public.shipping_address_key(p_customer),public.shipping_configuration(),p_distance_meters,amount,label) returning * into quote;
  return jsonb_build_object('id',quote.id,'distance_meters',quote.distance_meters,'fee',quote.fee,'name',quote.name,'expires_at',quote.expires_at);
end;
$$;
create or replace function public.quote_shipping_fee(p_customer jsonb) returns bigint language plpgsql stable security definer set search_path='' as $$
declare settings public.site_settings%rowtype; quote public.shipping_quotes%rowtype;
begin
  select * into settings from public.site_settings where id=true;
  if settings.shipping_distance_enabled then
    if coalesce(p_customer->>'shipping_quote_id','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then raise exception 'SHIPPING_QUOTE_REQUIRED'; end if;
    select * into quote from public.shipping_quotes where id=(p_customer->>'shipping_quote_id')::uuid;
    if quote.id is null or quote.expires_at<=clock_timestamp() or quote.address_key<>public.shipping_address_key(p_customer) or quote.configuration<>public.shipping_configuration() then raise exception 'SHIPPING_QUOTE_EXPIRED'; end if;
    return quote.fee;
  end if;
  return coalesce((select (zone->>'fee')::bigint from jsonb_array_elements(settings.shipping_zones) with ordinality zones(zone,position)
    where lower(btrim(zone->>'province'))=lower(btrim(p_customer->>'city')) and (jsonb_array_length(zone->'wards')=0 or exists(select 1 from jsonb_array_elements_text(zone->'wards') ward where lower(btrim(ward))=lower(btrim(p_customer->>'ward'))))
    order by (jsonb_array_length(zone->'wards')>0) desc,position asc limit 1),settings.shipping_fee);
end;
$$;
revoke all on function public.shipping_address_key(jsonb),public.shipping_configuration(),public.reserve_shipping_request(text),public.create_shipping_quote(jsonb,integer,text),public.quote_shipping_fee(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.shipping_address_key(jsonb),public.shipping_configuration(),public.reserve_shipping_request(text),public.create_shipping_quote(jsonb,integer,text),public.quote_shipping_fee(jsonb) to service_role;
notify pgrst,'reload schema';
commit;
