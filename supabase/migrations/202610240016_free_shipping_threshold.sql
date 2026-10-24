-- Owner feedback 24/10: free shipping for orders from a set amount (she
-- suggested 1–1.5tr). 0 turns it off. The threshold compares the goods
-- subtotal before vouchers, the same rule Google Merchant Center applies, so
-- the shop and its Shopping listings always agree.
begin;
alter table public.site_settings
  add column shipping_free_threshold bigint not null default 0
  check (shipping_free_threshold between 0 and 100000000);

-- The address is still checked first: an area the shop does not deliver to,
-- or a missing/expired distance quote, is refused whatever the order value.
create or replace function public.order_shipping_fee(p_customer jsonb, p_subtotal bigint) returns bigint language plpgsql stable security definer set search_path='' as $$
declare fee bigint; threshold bigint;
begin
  fee := public.quote_shipping_fee(p_customer);
  select shipping_free_threshold into threshold from public.site_settings where id=true;
  if coalesce(threshold,0) > 0 and p_subtotal >= threshold then return 0; end if;
  return fee;
end;
$$;
revoke all on function public.order_shipping_fee(jsonb,bigint) from public,anon,authenticated,service_role;
grant execute on function public.order_shipping_fee(jsonb,bigint) to service_role;

-- Keep every other create_order guarantee; swap only the shipping source.
do $$
declare definition text;
begin
  select pg_get_functiondef('public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text)'::regprocedure) into definition;
  if position('public.quote_shipping_fee(p_customer)' in definition)=0 then raise exception 'create_order shipping source changed; review migration'; end if;
  execute replace(definition,'public.quote_shipping_fee(p_customer)','public.order_shipping_fee(p_customer,subtotal)');
end;
$$;
notify pgrst, 'reload schema';
commit;
