-- Camada comercial do MeuLar Finanças.
-- Execute depois da migração 003.

alter table public.pf_households add column if not exists status text not null default 'trial'
  check (status in ('trial', 'active', 'past_due', 'suspended', 'cancelled'));
alter table public.pf_households add column if not exists plan text not null default 'family'
  check (plan in ('starter', 'family', 'premium'));
alter table public.pf_households add column if not exists licensed_users integer not null default 3
  check (licensed_users between 1 and 100);
alter table public.pf_households add column if not exists trial_ends_at timestamptz default (now() + interval '14 days');
alter table public.pf_households add column if not exists subscription_started_at timestamptz;
alter table public.pf_households add column if not exists subscription_ends_at timestamptz;
alter table public.pf_households add column if not exists billing_customer_id text;
alter table public.pf_households add column if not exists branding jsonb not null default
  '{"displayName":"MeuLar Finanças","logoUrl":"","primaryColor":"#059669","accentColor":"#0f766e"}'::jsonb;

create table if not exists public.pf_household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.pf_households(id) on delete cascade,
  email text not null,
  role public.pf_member_role not null default 'member',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);
create unique index if not exists pf_invites_pending_email_idx
  on public.pf_household_invites(household_id, lower(email)) where status = 'pending';

create table if not exists public.pf_platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'superadmin' check (role in ('superadmin', 'support', 'billing')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pf_audit_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.pf_households(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.pf_is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.pf_platform_admins where user_id = auth.uid() and active)
$$;

create or replace function public.pf_invite_member(target_household uuid, target_email text, target_role public.pf_member_role)
returns uuid language plpgsql security definer set search_path = public as $$
declare invite_id uuid; current_count integer; user_limit integer;
begin
  if not public.pf_can_manage(target_household) then raise exception 'Sem permissão para convidar usuários'; end if;
  if target_role not in ('admin', 'member', 'viewer') then raise exception 'Perfil de convite inválido'; end if;
  select count(*) into current_count from public.pf_household_members where household_id = target_household and active;
  select licensed_users into user_limit from public.pf_households where id = target_household;
  if current_count >= user_limit then raise exception 'Limite de usuários do plano atingido'; end if;
  update public.pf_household_invites set status = 'revoked'
    where household_id = target_household and lower(email) = lower(trim(target_email)) and status = 'pending';
  insert into public.pf_household_invites(household_id, email, role, invited_by)
    values (target_household, lower(trim(target_email)), target_role, auth.uid()) returning id into invite_id;
  insert into public.pf_audit_log(household_id, actor_user_id, action, entity_type, entity_id, details)
    values (target_household, auth.uid(), 'member.invited', 'invite', invite_id::text, jsonb_build_object('email', lower(trim(target_email)), 'role', target_role));
  return invite_id;
end $$;

create or replace function public.pf_accept_pending_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare accepted_count integer := 0; invite_row record; user_email text;
begin
  if auth.uid() is null then return 0; end if;
  user_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  for invite_row in select * from public.pf_household_invites
    where lower(email) = user_email and status = 'pending' and expires_at > now()
  loop
    insert into public.pf_household_members(household_id, user_id, display_name, role, active)
      values (invite_row.household_id, auth.uid(), split_part(user_email, '@', 1), invite_row.role, true)
      on conflict (household_id, user_id) do update set role = excluded.role, active = true;
    update public.pf_household_invites set status = 'accepted' where id = invite_row.id;
    accepted_count := accepted_count + 1;
  end loop;
  return accepted_count;
end $$;

alter table public.pf_household_invites enable row level security;
alter table public.pf_platform_admins enable row level security;
alter table public.pf_audit_log enable row level security;

create policy "pf invites read" on public.pf_household_invites for select to authenticated
  using (public.pf_can_manage(household_id) or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create policy "pf invites manage" on public.pf_household_invites for all to authenticated
  using (public.pf_can_manage(household_id)) with check (public.pf_can_manage(household_id));
create policy "pf platform admins self" on public.pf_platform_admins for select to authenticated
  using (user_id = auth.uid());
create policy "pf audit tenant read" on public.pf_audit_log for select to authenticated
  using (public.pf_can_manage(household_id) or public.pf_is_platform_admin());

grant select, insert, update, delete on public.pf_household_invites to authenticated;
grant select on public.pf_platform_admins, public.pf_audit_log to authenticated;
revoke all on function public.pf_is_platform_admin() from public, anon;
revoke all on function public.pf_invite_member(uuid, text, public.pf_member_role) from public, anon;
revoke all on function public.pf_accept_pending_invites() from public, anon;
grant execute on function public.pf_is_platform_admin() to authenticated;
grant execute on function public.pf_invite_member(uuid, text, public.pf_member_role) to authenticated;
grant execute on function public.pf_accept_pending_invites() to authenticated;

-- Logo por cliente no Supabase Storage.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('pf-brand-assets', 'pf-brand-assets', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do nothing;

create policy "pf brand public read" on storage.objects for select to public using (bucket_id = 'pf-brand-assets');
create policy "pf brand tenant insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pf-brand-assets' and public.pf_can_manage((storage.foldername(name))[1]::uuid));
create policy "pf brand tenant update" on storage.objects for update to authenticated
  using (bucket_id = 'pf-brand-assets' and public.pf_can_manage((storage.foldername(name))[1]::uuid))
  with check (bucket_id = 'pf-brand-assets' and public.pf_can_manage((storage.foldername(name))[1]::uuid));
create policy "pf brand tenant delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pf-brand-assets' and public.pf_can_manage((storage.foldername(name))[1]::uuid));
