begin;

alter table public.products add column cost_price bigint check (cost_price between 0 and 100000000);
alter table public.order_items
  add column unit_cost bigint check (unit_cost between 0 and 100000000),
  add column line_discount bigint check (line_discount >= 0 and line_discount <= price * quantity);

-- Public catalog/customer receipt reads must never disclose internal costs.
revoke select on public.products from anon,authenticated;
grant select(id,slug,name,category_id,price,stock,image_url,image_urls,video_url,variants,revision,description,featured,is_new,active,created_at) on public.products to anon,authenticated;
revoke select on public.order_items from anon,authenticated;
grant select(id,order_id,product_id,variant_id,variant_name,name,price,quantity,line_discount) on public.order_items to authenticated;

create function public.get_admin_products(p_offset integer default 0, p_limit integer default 500)
returns setof public.products language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  return query select * from public.products order by created_at desc,id desc limit least(greatest(p_limit,1),500) offset greatest(p_offset,0);
end;
$$;
revoke all on function public.get_admin_products(integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_products(integer,integer) to authenticated;

create function public.get_admin_order_item_costs(p_offset integer default 0, p_limit integer default 500)
returns table(id uuid,unit_cost bigint) language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin required' using errcode = '42501'; end if;
  return query select oi.id,oi.unit_cost from public.order_items oi order by oi.id limit least(greatest(p_limit,1),500) offset greatest(p_offset,0);
end;
$$;
revoke all on function public.get_admin_order_item_costs(integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.get_admin_order_item_costs(integer,integer) to authenticated;

create function public.protect_order_item_cost() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.unit_cost is distinct from old.unit_cost then raise exception 'COST_SNAPSHOT_IMMUTABLE'; end if;
  if new.line_discount is distinct from old.line_discount then raise exception 'LINE_DISCOUNT_SNAPSHOT_IMMUTABLE'; end if;
  return new;
end;
$$;
revoke all on function public.protect_order_item_cost() from public,anon,authenticated,service_role;
create trigger order_item_cost_immutable before update of unit_cost,line_discount on public.order_items for each row execute function public.protect_order_item_cost();

-- Amend the final variant/voucher/shipping RPC without replacing its guarantees.
-- Legacy order costs remain unknown; only newly submitted orders get a snapshot.
do $$
declare definition text; allocation text;
begin
  select pg_get_functiondef('public.create_order(jsonb,jsonb,uuid,text,text,uuid,text,text)'::regprocedure) into definition;
  if position('''price'',unit_price,''quantity''' in definition)=0
    or position('insert into public.order_items(order_id,product_id,variant_id,variant_name,name,price,quantity)' in definition)=0 then
    raise exception 'create_order cost snapshot source changed; review migration';
  end if;
  definition := replace(definition,'''price'',unit_price,''quantity''','''price'',unit_price,''unit_cost'',product.cost_price,''quantity''');
  definition := replace(definition,'insert into public.order_items(order_id,product_id,variant_id,variant_name,name,price,quantity)','insert into public.order_items(order_id,product_id,variant_id,variant_name,name,price,unit_cost,quantity,line_discount)');
  definition := replace(definition,'(value->>''price'')::bigint,(value->>''quantity'')::integer','(value->>''price'')::bigint,(value->>''unit_cost'')::bigint,(value->>''quantity'')::integer,(value->>''line_discount'')::bigint');
  if position('eligible_subtotal bigint' in definition)=0 or position('  insert into public.orders(' in definition)=0 then
    raise exception 'create_order discount allocation source changed; review migration';
  end if;
  allocation := $allocation$
  -- Exact line discounts preserve the voucher's product eligibility forever.
  -- Floor shares first; put rounding remainder on the last eligible lines,
  -- capped by each line's price so a tiny last item never has negative revenue.
  with lines as (
    select value,ordinal,(value->>'price')::bigint * (value->>'quantity')::integer as gross,
      (discount_amount > 0 and (promotion.scope <> 'product' or (value->>'product_id')::uuid = any(promotion.product_ids))) as eligible
    from jsonb_array_elements(snapshot) with ordinality entries(value,ordinal)
  ), shares as (
    select *,case when eligible then floor(gross::numeric * discount_amount / nullif(eligible_subtotal,0))::bigint else 0 end as allocated
    from lines
  ), capacities as (
    select *,case when eligible then gross-allocated else 0 end as capacity,
      discount_amount-sum(allocated) over () as remainder from shares
  ), final_lines as (
    select value || jsonb_build_object('line_discount',allocated + greatest(0,least(capacity,remainder-coalesce(sum(capacity) over (order by ordinal desc rows between unbounded preceding and 1 preceding),0)))) as value,ordinal
    from capacities
  )
  select jsonb_agg(value order by ordinal) into snapshot from final_lines;
$allocation$;
  definition := replace(definition,'  insert into public.orders(',allocation || '  insert into public.orders(');
  execute definition;
end;
$$;
notify pgrst, 'reload schema';
commit;
