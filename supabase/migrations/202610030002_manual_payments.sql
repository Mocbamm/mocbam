begin;

-- These settings are public receiving instructions, never banking/API secrets.
alter table public.site_settings
  add column bank_transfer_enabled boolean not null default false,
  add column bank_bin text not null default '',
  add column bank_name text not null default '',
  add column bank_account_number text not null default '',
  add column bank_account_name text not null default '',
  add constraint bank_bin_format check (bank_bin = '' or bank_bin ~ '^[0-9]{6}$'),
  add constraint bank_account_number_format check (bank_account_number = '' or bank_account_number ~ '^[A-Za-z0-9]{5,19}$'),
  add constraint bank_name_length check (bank_name = '' or length(btrim(bank_name)) between 1 and 100),
  add constraint bank_account_name_length check (bank_account_name = '' or length(btrim(bank_account_name)) between 1 and 100),
  add constraint enabled_bank_transfer_complete check (
    not bank_transfer_enabled or (
      bank_bin ~ '^[0-9]{6}$' and bank_account_number ~ '^[A-Za-z0-9]{5,19}$'
      and length(btrim(bank_name)) between 1 and 100
      and length(btrim(bank_account_name)) between 1 and 100
    )
  );

alter table public.orders
  drop constraint orders_payment_status_check,
  add column payment_method text not null default 'unconfigured' check (payment_method in ('cod', 'bank_transfer', 'unconfigured')),
  add column paid_at timestamptz,
  add column refunded_at timestamptz,
  add column payment_bank_bin text not null default '',
  add column payment_bank_name text not null default '',
  add column payment_bank_account_number text not null default '',
  add column payment_bank_account_name text not null default '',
  add constraint orders_payment_status_check check (payment_status in ('awaiting_payment', 'paid', 'refunded')),
  add constraint order_payment_timestamps check (
    (payment_status = 'awaiting_payment' and paid_at is null and refunded_at is null)
    or (payment_status = 'paid' and paid_at is not null and refunded_at is null)
    or (payment_status = 'refunded' and paid_at is not null and refunded_at is not null and refunded_at >= paid_at)
  ),
  add constraint order_receiving_bank_snapshot check (
    (payment_method = 'bank_transfer'
      and payment_bank_bin ~ '^[0-9]{6}$'
      and payment_bank_account_number ~ '^[A-Za-z0-9]{5,19}$'
      and length(payment_bank_name) between 1 and 100
      and length(payment_bank_account_name) between 1 and 100)
    or (payment_method in ('cod', 'unconfigured')
      and payment_bank_bin = '' and payment_bank_name = ''
      and payment_bank_account_number = '' and payment_bank_account_name = '')
  );

grant select(payment_method,paid_at,refunded_at,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name) on public.orders to authenticated;
-- Every application payment/fulfillment update goes through a checked RPC.
revoke update on public.orders from service_role;

create function public.protect_order_payment_snapshot() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.payment_method is distinct from old.payment_method
    or new.payment_bank_bin is distinct from old.payment_bank_bin
    or new.payment_bank_name is distinct from old.payment_bank_name
    or new.payment_bank_account_number is distinct from old.payment_bank_account_number
    or new.payment_bank_account_name is distinct from old.payment_bank_account_name then
    raise exception 'PAYMENT_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_order_payment_snapshot() from public, anon, authenticated, service_role;
create trigger order_payment_snapshot_immutable
before update of payment_method,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name on public.orders
for each row execute function public.protect_order_payment_snapshot();

create table public.order_payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null check (event in ('paid', 'refunded')),
  amount bigint not null check (amount >= 0),
  actor_id uuid not null references auth.users(id),
  note text not null check (note = btrim(note) and length(note) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (order_id, event)
);
alter table public.order_payment_events enable row level security;
revoke all on public.order_payment_events from public, anon, authenticated, service_role;
grant select on public.order_payment_events to authenticated, service_role;
create policy payment_events_admin_read on public.order_payment_events
for select to authenticated using (public.is_admin());

-- Remove the old overload: six-argument callers now use the COD default below.
drop function public.create_order(jsonb,jsonb,uuid,text,text,uuid);
create function public.create_order(p_items jsonb, p_customer jsonb, p_idempotency_key uuid, p_payload_hash text, p_receipt_hash text, p_user_id uuid, p_payment_method text default 'cod')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  existing public.orders%rowtype;
  item jsonb;
  product public.products%rowtype;
  payment_settings public.site_settings%rowtype;
  quantity integer;
  subtotal bigint := 0;
  snapshot jsonb := '[]'::jsonb;
  new_order public.orders%rowtype;
begin
  if p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
     or p_receipt_hash is null or p_receipt_hash !~ '^[a-f0-9]{64}$'
     or p_idempotency_key is null or p_payment_method is null
     or p_payment_method not in ('cod', 'bank_transfer') then
    raise exception 'INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 0));
  select * into existing from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    if existing.payload_hash <> p_payload_hash or existing.guest_access_hash <> p_receipt_hash
       or existing.user_id is distinct from p_user_id
       or existing.payment_method not in ('unconfigured', p_payment_method) then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('id', existing.id, 'reference', existing.reference);
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'INVALID_REQUEST'; end if;
  if jsonb_array_length(p_items) not between 1 and 20 then raise exception 'INVALID_REQUEST'; end if;
  if (select count(distinct value->>'product_id') from jsonb_array_elements(p_items)) <> jsonb_array_length(p_items) then raise exception 'INVALID_REQUEST'; end if;
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

  for item in select value from jsonb_array_elements(p_items) order by value->>'product_id' loop
    if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'quantity') is distinct from 'number'
       or coalesce(item->>'quantity', '') !~ '^[0-9]{1,2}$' then raise exception 'INVALID_REQUEST'; end if;
    quantity := (item->>'quantity')::integer;
    if quantity not between 1 and 99 then raise exception 'INVALID_REQUEST'; end if;
    select * into product from public.products where id = (item->>'product_id')::uuid for update;
    if not found or not product.active then raise exception 'PRODUCT_UNAVAILABLE'; end if;
    if product.stock < quantity then raise exception 'STOCK_UNAVAILABLE'; end if;
    subtotal := subtotal + product.price * quantity;
    snapshot := snapshot || jsonb_build_array(jsonb_build_object('product_id', product.id, 'name', product.name, 'price', product.price, 'quantity', quantity));
    update public.products set stock = stock - quantity where id = product.id;
  end loop;
  insert into public.orders(user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,idempotency_key,payload_hash,guest_access_hash,payment_method,payment_bank_bin,payment_bank_name,payment_bank_account_number,payment_bank_account_name)
    values (p_user_id,p_customer->>'name',lower(p_customer->>'email'),p_customer->>'phone',p_customer->>'address',p_customer->>'city',coalesce(p_customer->>'note',''),subtotal,payment_settings.shipping_fee,subtotal+payment_settings.shipping_fee,p_idempotency_key,p_payload_hash,p_receipt_hash,p_payment_method,
      case when p_payment_method = 'bank_transfer' then payment_settings.bank_bin else '' end,
      case when p_payment_method = 'bank_transfer' then btrim(payment_settings.bank_name) else '' end,
      case when p_payment_method = 'bank_transfer' then payment_settings.bank_account_number else '' end,
      case when p_payment_method = 'bank_transfer' then btrim(payment_settings.bank_account_name) else '' end)
    returning * into new_order;
  insert into public.order_items(order_id,product_id,name,price,quantity)
    select new_order.id,(value->>'product_id')::uuid,value->>'name',(value->>'price')::bigint,(value->>'quantity')::integer from jsonb_array_elements(snapshot);
  return jsonb_build_object('id',new_order.id,'reference',new_order.reference);
end;
$$;
revoke all on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text) to service_role;

create or replace function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_order public.orders%rowtype; item record;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_status is null then raise exception 'INVALID_REQUEST'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if current_order.status = p_status then
    return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status',current_order.payment_status);
  end if;
  if current_order.status in ('cancelled','completed') then raise exception 'ORDER_FINAL'; end if;
  if p_status = 'cancelled' then
    for item in select product_id,quantity from public.order_items where order_id = p_order_id order by product_id loop
      update public.products set stock = stock + item.quantity where id = item.product_id;
    end loop;
  end if;
  update public.orders set status = p_status where id = p_order_id;
  return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status',current_order.payment_status);
end;
$$;
revoke all on function public.set_order_status(uuid,public.order_status) from public, anon;
grant execute on function public.set_order_status(uuid,public.order_status) to authenticated;

-- This records an admin's independently verified full payment/refund; it moves no money.
create function public.record_order_payment(p_order_id uuid, p_action text, p_note text)
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
      if current_order.payment_status <> 'awaiting_payment' or current_order.status = 'cancelled' then raise exception 'PAYMENT_TRANSITION_CONFLICT'; end if;
      update public.orders set payment_status = 'paid', paid_at = now() where id = p_order_id returning * into current_order;
    else
      if current_order.payment_status <> 'paid' or current_order.status <> 'cancelled' then raise exception 'PAYMENT_TRANSITION_CONFLICT'; end if;
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
