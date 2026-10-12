-- Owner feedback 13/10: deliver only to the configured areas (her table stops at
-- 15 km). When enabled, an address outside every zone is refused instead of
-- charged the default fee.
begin;
alter table public.site_settings
  add column shipping_zones_only boolean not null default false;

create or replace function public.shipping_configuration() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',shipping_distance_enabled,'origin',shipping_origin_address,'bands',shipping_distance_bands,'zones',shipping_zones,'fee',shipping_fee,'zones_only',shipping_zones_only) from public.site_settings where id=true;
$$;

create or replace function public.quote_shipping_fee(p_customer jsonb) returns bigint language plpgsql stable security definer set search_path='' as $$
declare settings public.site_settings%rowtype; quote public.shipping_quotes%rowtype; zone_fee bigint;
begin
  select * into settings from public.site_settings where id=true;
  if settings.shipping_distance_enabled then
    if coalesce(p_customer->>'shipping_quote_id','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then raise exception 'SHIPPING_QUOTE_REQUIRED'; end if;
    select * into quote from public.shipping_quotes where id=(p_customer->>'shipping_quote_id')::uuid;
    if quote.id is null or quote.expires_at<=clock_timestamp() or quote.address_key<>public.shipping_address_key(p_customer) or quote.configuration<>public.shipping_configuration() then raise exception 'SHIPPING_QUOTE_EXPIRED'; end if;
    return quote.fee;
  end if;
  select (zone->>'fee')::bigint into zone_fee from jsonb_array_elements(settings.shipping_zones) with ordinality zones(zone,position)
    where lower(btrim(zone->>'province'))=lower(btrim(p_customer->>'city')) and (jsonb_array_length(zone->'wards')=0 or exists(select 1 from jsonb_array_elements_text(zone->'wards') ward where lower(btrim(ward))=lower(btrim(p_customer->>'ward'))))
    order by (jsonb_array_length(zone->'wards')>0) desc,position asc limit 1;
  if zone_fee is not null then return zone_fee; end if;
  if settings.shipping_zones_only then raise exception 'SHIPPING_UNAVAILABLE'; end if;
  return settings.shipping_fee;
end;
$$;
revoke all on function public.quote_shipping_fee(jsonb),public.shipping_configuration() from public,anon,authenticated,service_role;
grant execute on function public.quote_shipping_fee(jsonb),public.shipping_configuration() to service_role;
commit;
