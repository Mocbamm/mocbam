begin;

alter table public.discounts
  add column scope text not null default 'shop' check (scope in ('shop','product','private')),
  add column product_ids uuid[] not null default '{}' check (cardinality(product_ids) <= 200 and array_position(product_ids,null) is null),
  add column customer_user_ids uuid[] not null default '{}' check (cardinality(customer_user_ids) <= 200 and array_position(customer_user_ids,null) is null),
  alter column active set default true;
update public.discounts set scope = 'private' where customer_user_id is not null;
alter table public.discounts
  add constraint discount_product_scope check ((scope = 'product' and cardinality(product_ids) > 0) or (scope <> 'product' and cardinality(product_ids) = 0)),
  add constraint discount_customer_scope check (
    (scope = 'private' and not public_campaign and (customer_user_id is not null or cardinality(customer_user_ids) > 0) and (customer_user_id is null or cardinality(customer_user_ids) = 0))
    or (scope <> 'private' and customer_user_id is null and cardinality(customer_user_ids) = 0));
grant insert(scope,product_ids,customer_user_ids), update(scope,product_ids,customer_user_ids) on public.discounts to authenticated;

-- Preserve historical expired vouchers, but never create a voucher already ended.
create function public.validate_discount_scope() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.ends_at is not null and new.ends_at <= clock_timestamp() then raise exception 'DISCOUNT_EXPIRED'; end if;
  if exists(select 1 from unnest(new.product_ids) as selected(product_id) where not exists(select 1 from public.products where products.id = selected.product_id)) then raise exception 'INVALID_REQUEST'; end if;
  if exists(select 1 from unnest(new.customer_user_ids) as selected(user_id) where not exists(select 1 from auth.users where users.id = selected.user_id)) then raise exception 'INVALID_REQUEST'; end if;
  return new;
end;
$$;
revoke all on function public.validate_discount_scope() from public,anon,authenticated,service_role;
create trigger discount_scope_validation before insert or update on public.discounts for each row execute function public.validate_discount_scope();

drop policy discounts_public_read on public.discounts;
create policy discounts_public_read on public.discounts for select to anon, authenticated using (
  public.is_admin() or (active and public_campaign and scope in ('shop','product') and customer_user_id is null and cardinality(customer_user_ids) = 0
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
    and (max_uses is null or used_count < max_uses))
);

create or replace function public.create_order(p_items jsonb, p_customer jsonb, p_idempotency_key uuid, p_payload_hash text, p_receipt_hash text, p_user_id uuid, p_payment_method text default 'cod', p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  existing public.orders%rowtype;
  item jsonb;
  product public.products%rowtype;
  variant jsonb;
  chosen_variant uuid;
  unit_price bigint;
  payment_settings public.site_settings%rowtype;
  quantity integer;
  promotion public.discounts%rowtype;
  discount_amount bigint := 0;
  discount_code text := upper(btrim(coalesce(p_discount_code, '')));
  subtotal bigint := 0;
  eligible_subtotal bigint := 0;
  snapshot jsonb := '[]'::jsonb;
  new_order public.orders%rowtype;
begin
  if p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_receipt_hash is null or p_receipt_hash !~ '^[a-f0-9]{64}$'
     or p_idempotency_key is null or p_payment_method is null
     or p_payment_method not in ('cod', 'bank_transfer')
     or length(discount_code) > 40 or discount_code !~ '^[A-Z0-9_-]*$' then
    raise exception 'INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 0));
  select * into existing from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    if existing.payload_hash <> p_payload_hash or existing.guest_access_hash <> p_receipt_hash
       or existing.user_id is distinct from p_user_id
       or existing.payment_method not in ('unconfigured', p_payment_method)
       or existing.discount_code <> discount_code then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('id', existing.id, 'reference', existing.reference);
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_REQUEST'; end if;
  if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'INVALID_REQUEST'; end if;
  if (select count(distinct (value->>'product_id', coalesce(value->>'variant_id',''))) from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then raise exception 'INVALID_REQUEST'; end if;
  if jsonb_typeof(p_customer) is distinct from 'object' or length(trim(coalesce(p_customer->>'name', ''))) not between 1 and 100
     or length(coalesce(p_customer->>'email', '')) not between 3 and 254 or length(coalesce(p_customer->>'phone', '')) not between 7 and 30
     or length(trim(coalesce(p_customer->>'address', ''))) not between 1 and 500 or length(trim(coalesce(p_customer->>'city', ''))) not between 1 and 100
     or length(coalesce(p_customer->>'note', '')) > 1000 then raise exception 'INVALID_REQUEST'; end if;
  select * into strict payment_settings from public.site_settings where id = true for share;
  if p_payment_method = 'bank_transfer' and (
    not payment_settings.bank_transfer_enabled
    or payment_settings.bank_bin !~ '^[0-9]{6}$'
    or payment_settings.bank_account_number !~ '^[A-Za-z0-9]{5,19}$'
    or length(btrim(payment_settings.bank_name)) not between 1 and 100
    or length(btrim(payment_settings.bank_account_name)) not between 1 and 100
  ) then raise exception 'BANK_TRANSFER_UNAVAILABLE'; end if;

  for item in select value from jsonb_array_elements(p_items) order by value->>'product_id',value->>'variant_id' loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'quantity') is distinct from 'number'
       or coalesce(item->>'quantity', '') !~ '^[0-9]{1,2}$' then raise exception 'INVALID_REQUEST'; end if;
    quantity := (item->>'quantity')::integer;
    if quantity not between 1 and 99 then raise exception 'INVALID_REQUEST'; end if;
    select * into product from public.products where id = (item->>'product_id')::uuid for update;
    if not found or not product.active then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    chosen_variant := nullif(item->>'variant_id','')::uuid;
    if jsonb_array_length(product.variants) > 0 then
      select value into variant from jsonb_array_elements(product.variants) where value->>'id' = chosen_variant::text;
      if variant is null or not (variant->>'active')::boolean then raise exception 'PRODUCT_UNAVAILABLE'; end if;
      if (variant->>'stock')::integer < quantity then raise exception 'STOCK_UNAVAILABLE'; end if;
      unit_price := (variant->>'price')::bigint;
      update public.products set variants = (
        select jsonb_agg(case when value->>'id' = chosen_variant::text then jsonb_set(value,'{stock}',to_jsonb((value->>'stock')::integer - quantity)) else value end order by ordinal)
        from jsonb_array_elements(product.variants) with ordinality as entries(value,ordinal)
      ) where id = product.id;
    else
      if chosen_variant is not null then raise exception 'PRODUCT_UNAVAILABLE'; end if;
      if product.stock < quantity then raise exception 'STOCK_UNAVAILABLE'; end if;
      unit_price := product.price;
      update public.products set stock = stock - quantity where id = product.id;
    end if;
    subtotal := subtotal + unit_price * quantity;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('product_id',product.id,'variant_id',chosen_variant,'variant_name',coalesce(variant->>'name',''),'name',product.name,'price',unit_price,'quantity',quantity));
    variant := null;
  end loop;
  if discount_code <> '' then
    select * into promotion from public.discounts where code = discount_code for update;
    if not found or not promotion.active
       or (promotion.starts_at is not null and promotion.starts_at > clock_timestamp())
       or (promotion.ends_at is not null and promotion.ends_at <= clock_timestamp())
       or (promotion.customer_user_id is not null and promotion.customer_user_id is distinct from p_user_id)
       or (cardinality(promotion.customer_user_ids) > 0 and (p_user_id is null or not p_user_id = any(promotion.customer_user_ids)))
       or (promotion.max_uses is not null and promotion.used_count >= promotion.max_uses) then
      raise exception 'DISCOUNT_UNAVAILABLE';
    end if;
    if subtotal < promotion.min_subtotal then raise exception 'DISCOUNT_MINIMUM'; end if;
    select coalesce(sum((value->>'price')::bigint * (value->>'quantity')::integer),0) into eligible_subtotal
      from jsonb_array_elements(snapshot)
      where promotion.scope <> 'product' or (value->>'product_id')::uuid = any(promotion.product_ids);
    if eligible_subtotal <= 0 then raise exception 'DISCOUNT_UNAVAILABLE'; end if;
    discount_amount := least(eligible_subtotal, coalesce(promotion.max_discount, eligible_subtotal),
      case when promotion.kind = 'percentage' then (eligible_subtotal * promotion.value / 100) else promotion.value end);
    update public.discounts set used_count = used_count + 1 where id = promotion.id;
  end if;
  insert into public.orders(user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,discount_code,discount_amount,idempotency_key,payload_hash,guest_access_hash,payment_method,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name)
    values (p_user_id,p_customer->>'name',lower(p_customer->>'email'),p_customer->>'phone',p_customer->>'address',p_customer->>'city',coalesce(p_customer->>'note',''),subtotal,payment_settings.shipping_fee,subtotal+payment_settings.shipping_fee-discount_amount,discount_code,discount_amount,p_idempotency_key,p_payload_hash,p_receipt_hash,p_payment_method,
      case when p_payment_method = 'bank_transfer' then payment_settings.bank_bin else '' end,
      case when p_payment_method = 'bank_transfer' then btrim(payment_settings.bank_name) else '' end,
      case when p_payment_method = 'bank_transfer' then payment_settings.bank_account_number else '' end,
      case when p_payment_method = 'bank_transfer' then btrim(payment_settings.bank_account_name) else '' end)
    returning * into new_order;
  insert into public.order_items(order_id,product_id,variant_id,variant_name,name,price,quantity)
    select new_order.id,(value->>'product_id')::uuid,(value->>'variant_id')::uuid,coalesce(value->>'variant_name',''),value->>'name',(value->>'price')::bigint,(value->>'quantity')::integer from jsonb_array_elements(snapshot);
  return jsonb_build_object('id',new_order.id,'reference',new_order.reference);
end;
$$;
revoke all on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text) to service_role;


commit;
