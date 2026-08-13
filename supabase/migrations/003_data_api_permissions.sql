-- Complemento necessário para o frontend autenticado acessar o Data API.
-- Execute depois das migrações 001 e 002.

grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.pf_households,
  public.pf_household_members,
  public.pf_categories,
  public.pf_accounts,
  public.pf_budgets,
  public.pf_budget_items,
  public.pf_transactions
to authenticated;

grant select on public.pf_monthly_summary, public.pf_budget_vs_actual to authenticated;

-- Funções SECURITY DEFINER não ficam abertas para anon ou PUBLIC.
revoke all on function public.pf_is_member(uuid) from public, anon;
revoke all on function public.pf_can_manage(uuid) from public, anon;
revoke all on function public.pf_create_household(text, text) from public, anon;
grant execute on function public.pf_is_member(uuid) to authenticated;
grant execute on function public.pf_can_manage(uuid) to authenticated;
grant execute on function public.pf_create_household(text, text) to authenticated;

-- Garante que atualizações não movam registros para outra família.
drop policy if exists "pf households update" on public.pf_households;
create policy "pf households update" on public.pf_households for update to authenticated
using (public.pf_can_manage(id)) with check (public.pf_can_manage(id));

drop policy if exists "pf transactions update" on public.pf_transactions;
create policy "pf transactions update" on public.pf_transactions for update to authenticated
using (public.pf_is_member(household_id)) with check (public.pf_is_member(household_id));

-- A função de criação já valida auth.uid() e cria o proprietário no mesmo comando.
comment on function public.pf_create_household(text, text) is
  'Cria uma família e associa o usuário autenticado como proprietário.';
