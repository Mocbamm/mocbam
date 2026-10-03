begin;

create extension if not exists pgcrypto with schema extensions;
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'completed', 'cancelled');

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_members where user_id = auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 200),
  description text not null default '' check (length(description) <= 1000)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 200),
  category_id uuid not null references public.categories(id),
  price bigint not null check (price between 0 and 100000000),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null check (length(image_url) <= 500),
  description text not null default '' check (length(description) <= 10000),
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(title) between 1 and 200),
  excerpt text not null default '' check (length(excerpt) <= 1000),
  content text not null check (length(content) between 1 and 30000),
  image_url text not null check (length(image_url) <= 500),
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.site_content (
  key text primary key check (key ~ '^[a-z0-9_-]{1,80}$'),
  title text not null check (length(title) between 1 and 200),
  content text not null check (length(content) between 1 and 30000)
);
create table public.site_settings (
  id boolean primary key default true check (id),
  shipping_fee bigint not null default 0 check (shipping_fee between 0 and 100000000),
  shop_email text not null default 'hello@mocbam.vn',
  shop_phone text not null default '090 000 0000',
  shop_address text not null default 'TP. Hồ Chí Minh, Việt Nam',
  shop_hours text not null default 'Thứ 2 – Thứ 7 · 09:00 – 18:00',
  facebook_url text not null default '',
  instagram_url text not null default '',
  tiktok_url text not null default ''
);
insert into public.site_settings(id) values (true);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity,
  reference text generated always as ('MB-' || order_number::text) stored unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  note text not null default '',
  subtotal bigint not null check (subtotal >= 0),
  shipping_fee bigint not null check (shipping_fee >= 0),
  total bigint not null check (total = subtotal + shipping_fee),
  status public.order_status not null default 'pending',
  payment_status text not null default 'awaiting_payment' check (payment_status = 'awaiting_payment'),
  idempotency_key uuid not null unique,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  guest_access_hash text not null check (guest_access_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  name text not null,
  price bigint not null check (price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  unique (order_id, product_id)
);
create index order_items_order_idx on public.order_items(order_id);
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  email text not null check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 30),
  message text not null check (length(message) between 1 and 4000),
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index inquiries_email_created_idx on public.inquiries(email, created_at desc);

alter table public.admin_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.posts enable row level security;
alter table public.site_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inquiries enable row level security;

revoke all on public.admin_members, public.categories, public.products, public.posts, public.site_content, public.site_settings, public.orders, public.order_items, public.inquiries from anon, authenticated;
grant select on public.categories, public.products, public.posts, public.site_content, public.site_settings to anon, authenticated;
grant insert, update on public.categories, public.products, public.posts, public.site_content to authenticated;
grant update on public.site_settings to authenticated;
grant select on public.admin_members, public.inquiries to authenticated;
grant update(resolved) on public.inquiries to authenticated;
grant select(id,reference,user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,status,payment_status,created_at) on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.admin_members, public.categories, public.products, public.posts, public.site_content, public.site_settings, public.orders, public.order_items, public.inquiries to service_role;
grant usage, select on sequence public.orders_order_number_seq to service_role;

create policy admin_self_read on public.admin_members for select to authenticated using (user_id = auth.uid());
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_read on public.products for select to anon, authenticated using (active or public.is_admin());
create policy products_insert on public.products for insert to authenticated with check (public.is_admin());
create policy products_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy posts_read on public.posts for select to anon, authenticated using (published or public.is_admin());
create policy posts_insert on public.posts for insert to authenticated with check (public.is_admin());
create policy posts_update on public.posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_read on public.site_content for select to anon, authenticated using (true);
create policy content_insert on public.site_content for insert to authenticated with check (public.is_admin());
create policy content_update on public.site_content for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.site_settings for select to anon, authenticated using (true);
create policy settings_update on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy orders_owner_or_admin on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy items_owner_or_admin on public.order_items for select to authenticated using (
  public.is_admin() or exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy inquiries_admin_read on public.inquiries for select to authenticated using (public.is_admin());
create policy inquiries_admin_update on public.inquiries for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Only the server's secret key may submit orders. Totals and stock never come from the client.
create function public.create_order(p_items jsonb, p_customer jsonb, p_idempotency_key uuid, p_payload_hash text, p_receipt_hash text, p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  existing public.orders%rowtype;
  item jsonb;
  product public.products%rowtype;
  quantity integer;
  subtotal bigint := 0;
  shipping bigint;
  snapshot jsonb := '[]'::jsonb;
  new_order public.orders%rowtype;
begin
  if p_payload_hash !~ '^[a-f0-9]{64}$' or p_receipt_hash !~ '^[a-f0-9]{64}$' or p_idempotency_key is null then
    raise exception 'INVALID_REQUEST';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key::text, 0));
  select * into existing from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    if existing.payload_hash <> p_payload_hash or existing.guest_access_hash <> p_receipt_hash or existing.user_id is distinct from p_user_id then
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
  select shipping_fee into strict shipping from public.site_settings where id = true for share;

  -- Every transaction locks product IDs in the same order to prevent deadlocks.
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
  insert into public.orders(user_id,customer_name,email,phone,address,city,note,subtotal,shipping_fee,total,idempotency_key,payload_hash,guest_access_hash)
    values (p_user_id,p_customer->>'name',lower(p_customer->>'email'),p_customer->>'phone',p_customer->>'address',p_customer->>'city',coalesce(p_customer->>'note',''),subtotal,shipping,subtotal+shipping,p_idempotency_key,p_payload_hash,p_receipt_hash)
    returning * into new_order;
  insert into public.order_items(order_id,product_id,name,price,quantity)
    select new_order.id,(value->>'product_id')::uuid,value->>'name',(value->>'price')::bigint,(value->>'quantity')::integer from jsonb_array_elements(snapshot);
  return jsonb_build_object('id',new_order.id,'reference',new_order.reference);
end;
$$;
revoke all on function public.create_order(jsonb,jsonb,uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb,jsonb,uuid,text,text,uuid) to service_role;

create function public.set_order_status(p_order_id uuid, p_status public.order_status)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare current_order public.orders%rowtype; item record;
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  if p_status is null then raise exception 'INVALID_REQUEST'; end if;
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if current_order.status = p_status then return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status','awaiting_payment'); end if;
  if current_order.status in ('cancelled','completed') then raise exception 'ORDER_FINAL'; end if;
  if p_status = 'cancelled' then
    for item in select product_id,quantity from public.order_items where order_id = p_order_id order by product_id loop
      update public.products set stock = stock + item.quantity where id = item.product_id;
    end loop;
  end if;
  update public.orders set status = p_status where id = p_order_id;
  return jsonb_build_object('id',p_order_id,'status',p_status,'payment_status','awaiting_payment');
end;
$$;
revoke all on function public.set_order_status(uuid,public.order_status) from public, anon;
grant execute on function public.set_order_status(uuid,public.order_status) to authenticated;

create function public.submit_inquiry(p_name text,p_email text,p_phone text,p_message text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('inquiry:' || lower(p_email), 0));
  if (select count(*) from public.inquiries where email = lower(p_email) and created_at > now() - interval '10 minutes') >= 3 then raise exception 'TOO_MANY_REQUESTS'; end if;
  insert into public.inquiries(name,email,phone,message) values(p_name,lower(p_email),p_phone,p_message) returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.submit_inquiry(text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_inquiry(text,text,text,text) to service_role;

-- Private image bucket: shoppers can read only images referenced by published records.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('products','products',false,4000000,array['image/jpeg','image/png','image/webp']);
create policy product_images_read on storage.objects for select to anon, authenticated using (
  bucket_id = 'products' and (
    public.is_admin()
    or exists(select 1 from public.products where active and image_url = '/api/media/' || storage.objects.name)
    or exists(select 1 from public.posts where published and image_url = '/api/media/' || storage.objects.name)
  )
);
create policy product_images_admin_insert on storage.objects for insert to authenticated with check (bucket_id = 'products' and public.is_admin());

commit;
