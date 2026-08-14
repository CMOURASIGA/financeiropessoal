-- Execute depois do arquivo 001.
create or replace view public.pf_budget_vs_actual
with (security_invoker = true) as
with budget_months as (
  select b.household_id, b.year, bi.category_id, bi.type, m.month_number, m.budgeted
  from public.pf_budgets b
  join public.pf_budget_items bi on bi.budget_id = b.id
  cross join lateral (values
    (1, bi.jan), (2, bi.feb), (3, bi.mar), (4, bi.apr), (5, bi.may), (6, bi.jun),
    (7, bi.jul), (8, bi.aug), (9, bi.sep), (10, bi.oct), (11, bi.nov), (12, bi.dec)
  ) as m(month_number, budgeted)
), actuals as (
  select household_id, extract(year from competence_date)::int as year,
         extract(month from competence_date)::int as month_number,
         category_id, type, sum(amount) as actual
  from public.pf_transactions
  where status = 'paid'
  group by household_id, extract(year from competence_date), extract(month from competence_date), category_id, type
)
select bm.household_id, bm.year, bm.month_number, bm.category_id, c.name as category,
       bm.type, sum(bm.budgeted) as budgeted, coalesce(a.actual, 0) as actual,
       case when bm.type = 'expense' then sum(bm.budgeted) - coalesce(a.actual, 0)
            else coalesce(a.actual, 0) - sum(bm.budgeted) end as favorable_variance
from budget_months bm
join public.pf_categories c on c.id = bm.category_id
left join actuals a on a.household_id = bm.household_id and a.year = bm.year
  and a.month_number = bm.month_number and a.category_id = bm.category_id and a.type = bm.type
group by bm.household_id, bm.year, bm.month_number, bm.category_id, c.name, bm.type, a.actual;

grant select on public.pf_budget_vs_actual to authenticated;
