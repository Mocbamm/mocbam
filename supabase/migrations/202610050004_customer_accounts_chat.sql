begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 100),
  email text not null default '' check (length(email) <= 254),
  phone text not null default '' check (length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Supabase may grant ALL on newly created public tables by default. Reset
-- those privileges before exposing only the intended profile columns.
revoke all on public.profiles from public,anon,authenticated,service_role;
grant select on public.profiles to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create function public.touch_customer_profile() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger touch_customer_profile before update on public.profiles
  for each row execute function public.touch_customer_profile();

create function public.sync_customer_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name,email,phone)
  values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),100),
    lower(left(coalesce(new.email,''),254)),left(coalesce(new.raw_user_meta_data->>'phone',new.phone,''),30))
  on conflict(id) do update set email=excluded.email,updated_at=now();
  return new;
end;
$$;
revoke all on function public.sync_customer_profile() from public;
create trigger sync_customer_profile after insert or update of email on auth.users
  for each row execute function public.sync_customer_profile();
insert into public.profiles(id,full_name,email,phone,created_at)
select id,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),100),
  lower(left(coalesce(email,''),254)),left(coalesce(raw_user_meta_data->>'phone',phone,''),30),coalesce(created_at,now())
from auth.users on conflict(id) do nothing;

-- Ownership recovery is service-only and derives the verified email from Auth.
-- It cannot overwrite an order already associated with another account.
create function public.claim_guest_orders(p_user_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_count integer;
begin
  select lower(email) into v_email from auth.users
    where id=p_user_id and email_confirmed_at is not null and email is not null;
  if v_email is null or v_email='' then return 0; end if;
  update public.orders set user_id=p_user_id where user_id is null and lower(email)=v_email;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.claim_guest_orders(uuid) from public,anon,authenticated;
grant execute on function public.claim_guest_orders(uuid) to service_role;

create table public.chat_conversations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages)='array' and jsonb_array_length(messages)<=100 and octet_length(messages::text)<=80000),
  updated_at timestamptz not null default now()
);
alter table public.chat_conversations enable row level security;
revoke all on public.chat_conversations from public,anon,authenticated,service_role;
grant select,insert,update,delete on public.chat_conversations to authenticated;
grant all on public.chat_conversations to service_role;
create policy chat_own on public.chat_conversations for all to authenticated
  using (user_id=auth.uid()) with check (user_id=auth.uid());

commit;
