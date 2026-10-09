begin;

alter table public.products add column variants jsonb not null default '[]'::jsonb, add column revision bigint not null default 0;
alter table public.orders add column return_restocked boolean not null default false, add column returned_at timestamptz;
grant select(return_restocked,returned_at) on public.orders to authenticated;

alter table public.order_items
  add column variant_id uuid,
  add column variant_name text not null default '',
  drop constraint order_items_order_id_product_id_key,
  add constraint order_items_order_product_variant_key unique nulls not distinct (order_id,product_id,variant_id);

-- A product owns its variant inventory. Its public stock/price stay in sync.
create function public.validate_product_variants() returns trigger
language plpgsql security definer set search_path = '' as $$
declare variant jsonb; variant_stock integer := 0; variant_price bigint;
begin
  if jsonb_typeof(new.variants) is distinct from 'array' or jsonb_array_length(new.variants) > 30 then raise exception 'INVALID_REQUEST'; end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(new.variants)) <> jsonb_array_length(new.variants) then raise exception 'INVALID_REQUEST'; end if;
  for variant in select value from jsonb_array_elements(new.variants) loop
    if jsonb_typeof(variant) is distinct from 'object'
      or coalesce(variant->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or length(btrim(coalesce(variant->>'name',''))) not between 1 and 80
      or jsonb_typeof(variant->'active') is distinct from 'boolean'
      or jsonb_typeof(variant->'price') is distinct from 'number' or coalesce(variant->>'price','') !~ '^[0-9]+$'
      or jsonb_typeof(variant->'stock') is distinct from 'number' or coalesce(variant->>'stock','') !~ '^[0-9]+$'
      or (variant->>'price')::bigint not between 0 and 100000000
      or (variant->>'stock')::integer not between 0 and 100000 then raise exception 'INVALID_REQUEST'; end if;
    if (variant->>'active')::boolean then variant_stock := variant_stock + (variant->>'stock')::integer; end if;
    if (variant->>'active')::boolean then variant_price := least(variant_price,(variant->>'price')::bigint); end if;
  end loop;
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
    if (jsonb_array_length(old.variants) = 0) is distinct from (jsonb_array_length(new.variants) = 0)
      and exists(select 1 from public.order_items where product_id = new.id) then raise exception 'VARIANT_MODE_LOCKED'; end if;
    if exists(select 1 from public.order_items oi where oi.product_id = new.id and oi.variant_id is not null
      and not exists(select 1 from jsonb_array_elements(new.variants) v where v->>'id' = oi.variant_id::text)) then raise exception 'VARIANT_IN_USE'; end if;
  end if;
  if jsonb_array_length(new.variants) > 0 then new.stock := variant_stock; new.price := coalesce(variant_price,new.price); end if;
  return new;
end;
$$;
revoke all on function public.validate_product_variants() from public,anon,authenticated,service_role;
create trigger product_variants_inventory before insert or update on public.products for each row execute function public.validate_product_variants();

grant delete on public.products to authenticated;
create policy products_delete on public.products for delete to authenticated using (public.is_admin());

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
       or (promotion.max_uses is not null and promotion.used_count >= promotion.max_uses) then
      raise exception 'DISCOUNT_UNAVAILABLE';
    end if;
    if subtotal < promotion.min_subtotal then raise exception 'DISCOUNT_MINIMUM'; end if;
    discount_amount := least(subtotal, coalesce(promotion.max_discount, subtotal),
      case when promotion.kind = 'percentage' then (subtotal * promotion.value / 100) else promotion.value end);
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



-- A return means every item has physically arrived back. Damaged returns do not replenish inventory.
-- Replaying a cancellation/return never restores stock more than once.
drop function public.set_order_status(uuid,public.order_status);
create function public.set_order_status(p_order_id uuid, p_status public.order_status, p_restock boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_order public.orders%rowtype; item record; product public.products%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_status is null or p_restock is null or (p_restock and p_status <> 'returned') then raise exception 'INVALID_REQUEST'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if current_order.status = p_status then return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status',current_order.payment_status); end if;
  if current_order.status in ('cancelled','returned') then raise exception 'ORDER_FINAL'; end if;
  if current_order.status = 'completed' and p_status <> 'returned' then raise exception 'ORDER_FINAL'; end if;
  if current_order.status = 'shipped' and p_status not in ('completed','returned') then raise exception 'ORDER_FINAL'; end if;
  if p_status = 'returned' and current_order.status not in ('shipped','completed') then raise exception 'RETURN_NOT_ALLOWED'; end if;
  if p_status = 'cancelled' and current_order.status = 'shipped' then raise exception 'RETURN_REQUIRED'; end if;
  if p_status = 'cancelled' or (p_status = 'returned' and p_restock) then
    for item in select product_id,variant_id,quantity from public.order_items where order_id = p_order_id order by product_id,variant_id loop
      select * into product from public.products where id = item.product_id for update;
      if item.variant_id is null then
        update public.products set stock = stock + item.quantity where id = item.product_id;
      else
        if not exists(select 1 from jsonb_array_elements(product.variants) v where v->>'id' = item.variant_id::text) then raise exception 'VARIANT_IN_USE'; end if;
        update public.products set variants = (
          select jsonb_agg(case when value->>'id' = item.variant_id::text then jsonb_set(value,'{stock}',to_jsonb((value->>'stock')::integer + item.quantity)) else value end order by ordinal)
          from jsonb_array_elements(product.variants) with ordinality as entries(value,ordinal)
        ) where id = item.product_id;
      end if;
    end loop;
  end if;
  update public.orders set status = p_status,return_restocked = (p_status = 'returned' and p_restock),returned_at = case when p_status = 'returned' then now() else returned_at end where id = p_order_id;
  return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status',current_order.payment_status);
end;
$$;
revoke all on function public.set_order_status(uuid,public.order_status,boolean) from public,anon;
grant execute on function public.set_order_status(uuid,public.order_status,boolean) to authenticated;

create or replace function public.record_order_payment(p_order_id uuid, p_action text, p_note text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_order public.orders%rowtype; payment_note text;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_order_id is null or p_action is null or p_action not in ('paid','refunded') then raise exception 'INVALID_REQUEST'; end if;
  payment_note := regexp_replace(p_note, '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if payment_note is null or length(payment_note) not between 1 and 200 then raise exception 'INVALID_PAYMENT_NOTE'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;

  -- A repeated applied action returns the current state, even after a later refund.
  if not exists(select 1 from public.order_payment_events where order_id = p_order_id and event = p_action) then
    if p_action = 'paid' then
      if current_order.payment_status <> 'awaiting_payment' or current_order.status in ('cancelled','returned') then raise exception 'PAYMENT_TRANSITION_CONFLICT'; end if;
      update public.orders set payment_status = 'paid', paid_at = now() where id = p_order_id returning * into current_order;
    else
      if current_order.payment_status <> 'paid' or current_order.status not in ('cancelled','returned') then raise exception 'PAYMENT_TRANSITION_CONFLICT'; end if;
      update public.orders set payment_status = 'refunded', refunded_at = now() where id = p_order_id returning * into current_order;
    end if;
    insert into public.order_payment_events(order_id,event,amount,actor_id,note)
      values(p_order_id,p_action,current_order.total,auth.uid(),payment_note);
  end if;
  return jsonb_build_object('id',p_order_id,'status',current_order.status,'payment_status',current_order.payment_status,'paid_at',current_order.paid_at,'refunded_at',current_order.refunded_at);
end;
$$;
revoke all on function public.record_order_payment(uuid,text,text) from public, anon, service_role;
grant execute on function public.record_order_payment(uuid,text,text) to authenticated;

commit;
