-- MeuLar Finanças
-- Execute este arquivo no SQL Editor do Supabase.
-- Todas as tabelas usam o prefixo pf_ para não misturar com o FinControl empresarial.

create extension if not exists pgcrypto;

create type public.pf_member_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.pf_entry_type as enum ('income', 'expense');
create type public.pf_entry_status as enum ('pending', 'paid', 'reserved', 'cancelled');
create type public.pf_budget_status as enum ('draft', 'approved', 'closed');
create type public.pf_account_type as enum ('checking', 'savings', 'cash', 'credit_card', 'investment', 'other');

create table public.pf_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency char(3) not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pf_household_members (
  household_id uuid not null references public.pf_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role public.pf_member_role not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.pf_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.pf_households(id) on delete cascade,
  name text not null,
  type public.pf_entry_type not null,
  parent_id uuid references public.pf_categories(id) on delete set null,
  color text,
  icon text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, type, name)
);

create table public.pf_accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.pf_households(id) on delete cascade,
  name text not null,
  type public.pf_account_type not null,
  opening_balance numeric(14,2) not null default 0,
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table public.pf_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.pf_households(id) on delete cascade,
  year smallint not null check (year between 2000 and 2200),
  status public.pf_budget_status not null default 'draft',
  notes text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, year)
);

create table public.pf_budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.pf_budgets(id) on delete cascade,
  category_id uuid not null references public.pf_categories(id),
  type public.pf_entry_type not null,
  description text not null,
  jan numeric(14,2) not null default 0 check (jan >= 0),
  feb numeric(14,2) not null default 0 check (feb >= 0),
  mar numeric(14,2) not null default 0 check (mar >= 0),
  apr numeric(14,2) not null default 0 check (apr >= 0),
  may numeric(14,2) not null default 0 check (may >= 0),
  jun numeric(14,2) not null default 0 check (jun >= 0),
  jul numeric(14,2) not null default 0 check (jul >= 0),
  aug numeric(14,2) not null default 0 check (aug >= 0),
  sep numeric(14,2) not null default 0 check (sep >= 0),
  oct numeric(14,2) not null default 0 check (oct >= 0),
  nov numeric(14,2) not null default 0 check (nov >= 0),
  dec numeric(14,2) not null default 0 check (dec >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pf_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.pf_households(id) on delete cascade,
  category_id uuid not null references public.pf_categories(id),
  account_id uuid references public.pf_accounts(id) on delete set null,
  member_user_id uuid references auth.users(id) on delete set null,
  type public.pf_entry_type not null,
  status public.pf_entry_status not null default 'pending',
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  competence_date date not null,
  due_date date,
  paid_at timestamptz,
  notes text,
  is_recurring boolean not null default false,
  recurrence_group_id uuid,
  installment_number integer check (installment_number is null or installment_number > 0),
  installment_total integer check (installment_total is null or installment_total > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (installment_number is null or installment_total is null or installment_number <= installment_total)
);

create index pf_transactions_household_date_idx on public.pf_transactions (household_id, competence_date desc);
create index pf_transactions_category_idx on public.pf_transactions (category_id, competence_date desc);
create index pf_budget_items_budget_idx on public.pf_budget_items (budget_id);
create index pf_members_user_idx on public.pf_household_members (user_id) where active;

create or replace function public.pf_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger pf_households_updated before update on public.pf_households for each row execute function public.pf_set_updated_at();
create trigger pf_budgets_updated before update on public.pf_budgets for each row execute function public.pf_set_updated_at();
create trigger pf_budget_items_updated before update on public.pf_budget_items for each row execute function public.pf_set_updated_at();
create trigger pf_transactions_updated before update on public.pf_transactions for each row execute function public.pf_set_updated_at();

create or replace function public.pf_is_member(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pf_household_members
    where household_id = target_household and user_id = auth.uid() and active
  )
$$;

create or replace function public.pf_can_manage(target_household uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pf_household_members
    where household_id = target_household and user_id = auth.uid() and active
      and role in ('owner', 'admin')
  )
$$;

alter table public.pf_households enable row level security;
alter table public.pf_household_members enable row level security;
alter table public.pf_categories enable row level security;
alter table public.pf_accounts enable row level security;
alter table public.pf_budgets enable row level security;
alter table public.pf_budget_items enable row level security;
alter table public.pf_transactions enable row level security;

create policy "pf households select" on public.pf_households for select using (public.pf_is_member(id));
create policy "pf households insert" on public.pf_households for insert with check (created_by = auth.uid());
create policy "pf households update" on public.pf_households for update using (public.pf_can_manage(id));
create policy "pf households delete" on public.pf_households for delete using (created_by = auth.uid());

create policy "pf members select" on public.pf_household_members for select using (public.pf_is_member(household_id));
create policy "pf members manage" on public.pf_household_members for all using (public.pf_can_manage(household_id)) with check (public.pf_can_manage(household_id));

create policy "pf categories select" on public.pf_categories for select using (public.pf_is_member(household_id));
create policy "pf categories manage" on public.pf_categories for all using (public.pf_can_manage(household_id)) with check (public.pf_can_manage(household_id));
create policy "pf accounts select" on public.pf_accounts for select using (public.pf_is_member(household_id));
create policy "pf accounts manage" on public.pf_accounts for all using (public.pf_can_manage(household_id)) with check (public.pf_can_manage(household_id));
create policy "pf budgets select" on public.pf_budgets for select using (public.pf_is_member(household_id));
create policy "pf budgets manage" on public.pf_budgets for all using (public.pf_can_manage(household_id)) with check (public.pf_can_manage(household_id));
create policy "pf budget items select" on public.pf_budget_items for select using (exists (select 1 from public.pf_budgets b where b.id = budget_id and public.pf_is_member(b.household_id)));
create policy "pf budget items manage" on public.pf_budget_items for all using (exists (select 1 from public.pf_budgets b where b.id = budget_id and public.pf_can_manage(b.household_id))) with check (exists (select 1 from public.pf_budgets b where b.id = budget_id and public.pf_can_manage(b.household_id)));
create policy "pf transactions select" on public.pf_transactions for select using (public.pf_is_member(household_id));
create policy "pf transactions insert" on public.pf_transactions for insert with check (public.pf_is_member(household_id) and created_by = auth.uid());
create policy "pf transactions update" on public.pf_transactions for update using (public.pf_is_member(household_id));
create policy "pf transactions delete" on public.pf_transactions for delete using (public.pf_can_manage(household_id) or created_by = auth.uid());

create or replace function public.pf_create_household(household_name text, owner_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_household_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  insert into public.pf_households(name, created_by) values (household_name, auth.uid()) returning id into new_household_id;
  insert into public.pf_household_members(household_id, user_id, display_name, role) values (new_household_id, auth.uid(), owner_name, 'owner');
  insert into public.pf_categories(household_id, name, type, sort_order) values
    (new_household_id, 'Salários e Pró-labore', 'income', 10),
    (new_household_id, 'Outras receitas', 'income', 20),
    (new_household_id, 'Moradia', 'expense', 30),
    (new_household_id, 'Alimentação', 'expense', 40),
    (new_household_id, 'Saúde', 'expense', 50),
    (new_household_id, 'Educação', 'expense', 60),
    (new_household_id, 'Transporte', 'expense', 70),
    (new_household_id, 'Comunicação', 'expense', 80),
    (new_household_id, 'Seguros', 'expense', 90),
    (new_household_id, 'Lazer e esportes', 'expense', 100),
    (new_household_id, 'Impostos e taxas', 'expense', 110),
    (new_household_id, 'Investimentos e reservas', 'expense', 120),
    (new_household_id, 'Cartões de crédito', 'expense', 130),
    (new_household_id, 'Outros', 'expense', 140);
  return new_household_id;
end $$;

grant execute on function public.pf_create_household(text, text) to authenticated;

create or replace view public.pf_monthly_summary
with (security_invoker = true) as
select household_id,
       date_trunc('month', competence_date)::date as month,
       sum(amount) filter (where type = 'income' and status = 'paid') as realized_income,
       sum(amount) filter (where type = 'expense' and status = 'paid') as realized_expense,
       sum(amount) filter (where type = 'expense' and status = 'reserved') as reserved_expense,
       sum(amount) filter (where status = 'pending') as pending_amount
from public.pf_transactions
where status <> 'cancelled'
group by household_id, date_trunc('month', competence_date);

grant select on public.pf_monthly_summary to authenticated;
