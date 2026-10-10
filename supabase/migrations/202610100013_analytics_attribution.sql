begin;

-- Pseudonymous attribution is optional and isolated from customer-readable orders.
create table public.order_analytics (
  order_id uuid primary key references public.orders(id) on delete cascade,
  client_id text not null check (client_id ~ '^[0-9]{1,20}\.[0-9]{1,20}$'),
  session_id text not null check (session_id ~ '^[1-9][0-9]{0,14}$'),
  landing_path text not null check (
    length(landing_path) <= 500 and landing_path ~ '^/([a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]*$'
    and landing_path !~ '^/(admin|auth|tai-khoan|don-hang)(/|$)'
  ),
  consented_at timestamptz not null default now()
);
create table public.order_analytics_events (
  order_id uuid not null references public.order_analytics(order_id) on delete cascade,
  event text not null check (event in ('purchase','refund')),
  occurred_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','sending','sent','expired','uncertain')),
  attempts integer not null default 0,
  lease_until timestamptz,
  accepted_at timestamptz,
  primary key (order_id,event)
);
create index order_analytics_pending_idx on public.order_analytics_events(occurred_at)
  where status in ('pending','sending');
alter table public.order_analytics enable row level security;
alter table public.order_analytics_events enable row level security;
revoke all on public.order_analytics,public.order_analytics_events from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.order_analytics,public.order_analytics_events to service_role;

create function public.create_order_with_analytics(
  p_items jsonb,p_customer jsonb,p_idempotency_key uuid,p_payload_hash text,
  p_receipt_hash text,p_user_id uuid,p_payment_method text default 'cod',
  p_discount_code text default '',p_analytics jsonb default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare receipt jsonb;
begin
  receipt := public.create_order(p_items,p_customer,p_idempotency_key,p_payload_hash,p_receipt_hash,p_user_id,p_payment_method,p_discount_code);
  if p_analytics is not null then
    if p_analytics->'consent' is distinct from 'true'::jsonb
      or jsonb_typeof(p_analytics) is distinct from 'object'
      or (select count(*) from jsonb_object_keys(p_analytics)) <> 4
      or p_analytics->>'client_id' is null or p_analytics->>'session_id' is null
      or p_analytics->>'landing_path' is null then
      raise exception 'INVALID_ANALYTICS_CONSENT';
    end if;
    insert into public.order_analytics(order_id,client_id,session_id,landing_path)
      values((receipt->>'id')::uuid,p_analytics->>'client_id',p_analytics->>'session_id',p_analytics->>'landing_path')
      on conflict(order_id) do nothing;
  end if;
  return receipt;
end;
$$;
revoke all on function public.create_order_with_analytics(jsonb,jsonb,uuid,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_order_with_analytics(jsonb,jsonb,uuid,text,text,uuid,text,text,jsonb) to service_role;

create function public.queue_order_analytics() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.order_analytics where order_id = new.id) then
    if new.status = 'completed' and new.payment_status = 'paid' then
      insert into public.order_analytics_events(order_id,event) values(new.id,'purchase') on conflict do nothing;
    end if;
    if new.payment_status = 'refunded' and exists(
      select 1 from public.order_analytics_events where order_id = new.id and event = 'purchase'
    ) then
      insert into public.order_analytics_events(order_id,event) values(new.id,'refund') on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_order_analytics() from public,anon,authenticated,service_role;
create trigger order_analytics_success after update of status,payment_status on public.orders
  for each row execute function public.queue_order_analytics();

-- A short lease prevents concurrent requests from dispatching the same event.
create function public.claim_order_analytics(p_limit integer default 10) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  update public.order_analytics_events set status = 'expired',lease_until = null
    where status in ('pending','sending') and occurred_at < now() - interval '72 hours';
  -- GA4 guarantees transaction-ID dedupe for purchase, not refund. A crashed
  -- refund dispatch may have reached Google; never blindly deduct it twice.
  update public.order_analytics_events set status = 'uncertain',lease_until = null
    where event = 'refund' and status = 'sending' and lease_until < now();
  with candidates as (
    select e.order_id,e.event from public.order_analytics_events e
    where ((e.status = 'pending' and (e.lease_until is null or e.lease_until < now())) or (e.status = 'sending' and e.lease_until < now()))
      and (e.event = 'purchase' or exists(select 1 from public.order_analytics_events p where p.order_id = e.order_id and p.event = 'purchase' and p.status = 'sent'))
    order by e.occurred_at,e.event limit greatest(1,least(p_limit,20)) for update skip locked
  ), claimed as (
    update public.order_analytics_events e set status = 'sending',attempts = attempts + 1,lease_until = now() + interval '2 minutes'
      from candidates c where e.order_id = c.order_id and e.event = c.event returning e.*
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'order_id',c.order_id,'event',c.event,'occurred_at',c.occurred_at,
    'client_id',a.client_id,'session_id',a.session_id,
    'value',greatest(0,o.subtotal-o.discount_amount),'shipping',o.shipping_fee,
    'items',(select coalesce(jsonb_agg(jsonb_build_object('item_id',i.product_id,'item_name',i.name,'price',greatest(0,i.price-coalesce(i.line_discount,0)::numeric/i.quantity),'quantity',i.quantity)), '[]'::jsonb) from public.order_items i where i.order_id = c.order_id)
  )), '[]'::jsonb) into result from claimed c
    join public.order_analytics a on a.order_id = c.order_id join public.orders o on o.id = c.order_id;
  return result;
end;
$$;
revoke all on function public.claim_order_analytics(integer) from public,anon,authenticated;
grant execute on function public.claim_order_analytics(integer) to service_role;

-- The conversion numerator remains the actual store ledger, never order_submitted.
create function public.traffic_order_summary(p_from date,p_to date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_from > p_to then raise exception 'INVALID_DATE_RANGE'; end if;
  with successful as (
    select o.id,o.subtotal-o.discount_amount as revenue,a.landing_path
    from public.orders o left join public.order_analytics a on a.order_id = o.id
    where o.status = 'completed' and o.payment_status = 'paid'
      and o.created_at >= (p_from::timestamp at time zone 'Asia/Ho_Chi_Minh')
      and o.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
  ), landing as (
    select landing_path,count(*) as orders,sum(revenue) as revenue from successful
      where landing_path is not null group by landing_path
  ) select jsonb_build_object(
    'successful_orders',(select count(*) from successful),
    'attributed_orders',(select count(*) from successful where landing_path is not null),
    'landing_revenue',coalesce((select jsonb_agg(jsonb_build_object('name',landing_path,'orders',orders,'revenue',revenue)) from landing),'[]'::jsonb),
    'pending_events',(select count(*) from public.order_analytics_events where status in ('pending','sending')),
    'expired_events',(select count(*) from public.order_analytics_events where status = 'expired'),
    'uncertain_events',(select count(*) from public.order_analytics_events where status = 'uncertain')
  ) into result;
  return result;
end;
$$;
revoke all on function public.traffic_order_summary(date,date) from public,anon,service_role;
grant execute on function public.traffic_order_summary(date,date) to authenticated;

commit;
