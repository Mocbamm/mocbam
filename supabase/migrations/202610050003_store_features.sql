begin;

alter table public.products
  add column image_urls text[] not null default '{}' check (cardinality(image_urls) <= 8),
  add column video_url text not null default '' check (length(video_url) <= 500),
  add column is_new boolean not null default false;
alter table public.site_settings
  add column zalo_url text not null default '',
  add column shopee_url text not null default '';

create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{1,40}$'),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '' check (length(description) <= 1000),
  kind text not null check (kind in ('percentage','fixed')),
  value bigint not null check (value between 1 and 100000000),
  min_subtotal bigint not null default 0 check (min_subtotal between 0 and 100000000),
  max_discount bigint check (max_discount between 0 and 100000000),
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  public_campaign boolean not null default false,
  customer_user_id uuid references auth.users(id) on delete cascade,
  max_uses integer check (max_uses between 1 and 1000000),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  constraint discount_percentage_limit check (kind <> 'percentage' or value <= 100),
  constraint discount_window check (starts_at is null or ends_at is null or ends_at > starts_at),
  constraint private_discount_not_public check (customer_user_id is null or not public_campaign)
);
alter table public.discounts enable row level security;
revoke all on public.discounts from public, anon, authenticated, service_role;
grant select on public.discounts to anon, authenticated, service_role;
grant insert(code,title,description,kind,value,min_subtotal,max_discount,starts_at,ends_at,active,public_campaign,customer_user_id,max_uses),
  update(code,title,description,kind,value,min_subtotal,max_discount,starts_at,ends_at,active,public_campaign,customer_user_id,max_uses)
  on public.discounts to authenticated;
create policy discounts_public_read on public.discounts for select to anon, authenticated using (
  public.is_admin() or (active and public_campaign and customer_user_id is null
    and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
    and (max_uses is null or used_count < max_uses))
);
create policy discounts_admin_insert on public.discounts for insert to authenticated with check (public.is_admin());
create policy discounts_admin_update on public.discounts for update to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.orders
  drop constraint orders_check,
  add column discount_code text not null default '' check (discount_code ~ '^[A-Z0-9_-]{0,40}$'),
  add column discount_amount bigint not null default 0 check (discount_amount >= 0 and discount_amount <= subtotal),
  add constraint orders_total_check check (total = subtotal + shipping_fee - discount_amount and total >= 0),
  add constraint order_discount_snapshot check (discount_code <> '' or discount_amount = 0);
grant select(discount_code,discount_amount) on public.orders to authenticated;

create function public.protect_order_discount_snapshot() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.discount_code is distinct from old.discount_code or new.discount_amount is distinct from old.discount_amount then
    raise exception 'DISCOUNT_SNAPSHOT_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_order_discount_snapshot() from public, anon, authenticated, service_role;
create trigger order_discount_snapshot_immutable before update of discount_code,discount_amount on public.orders
  for each row execute function public.protect_order_discount_snapshot();

-- Six/seven-argument clients retain COD/no-discount defaults and historical hashes.
drop function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text);
create function public.create_order(p_items jsonb, p_customer jsonb, p_idempotency_key uuid, p_payload_hash text, p_receipt_hash text, p_user_id uuid, p_payment_method text default 'cod', p_discount_code text default '')
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  existing public.orders%rowtype;
  item jsonb;
  product public.products%rowtype;
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
  insert into public.order_items(order_id,product_id,name,price,quantity)
    select new_order.id,(value->>'product_id')::uuid,value->>'name',(value->>'price')::bigint,(value->>'quantity')::integer from jsonb_array_elements(snapshot);
  return jsonb_build_object('id',new_order.id,'reference',new_order.reference);
end;
$$;
revoke all on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text) to service_role;


-- Private storage stays private until a published product/post references it.
update storage.buckets set file_size_limit = 20000000,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'] where id = 'products';
drop policy product_images_read on storage.objects;
create policy product_images_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'products' and (
    public.is_admin()
    or exists(select 1 from public.products where active and (
      image_url = '/api/media/' || storage.objects.name
      or '/api/media/' || storage.objects.name = any(image_urls)
      or video_url = '/api/media/' || storage.objects.name))
    or exists(select 1 from public.posts where published and image_url = '/api/media/' || storage.objects.name)
  )
);

update public.site_content set content = replace(content, '; cấu hình ban đầu của đồ án là 0đ', '') where key = 'shipping';
update public.site_content set content = replace(content, ' Đây là nội dung mẫu cho đồ án; chính sách thực tế cần được cập nhật trước khi kinh doanh.', '') where key = 'privacy';
update public.site_content set content = replace(content, 'Website Mộc Bàm là sản phẩm đồ án tốt nghiệp. Danh mục và hình minh họa ban đầu là dữ liệu mẫu. ', '') where key = 'terms';

commit;
