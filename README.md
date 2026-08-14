# MeuLar Finanças

Sistema de planejamento e controle financeiro pessoal e familiar, criado a partir da base do FinControl.

## Escopo do MVP

- orçamento anual para o ano seguinte, detalhado por categoria e mês;
- receitas, despesas, reservas e investimentos da família;
- lançamentos pagos, pendentes e reservados;
- identificação do responsável e da conta ou cartão;
- comparação mensal e anual entre orçamento e realizado;
- relatório anual e categorias configuráveis.

## Execução local

```bash
npm install
npm run dev
```

O MVP usa `localStorage`, mantendo a mesma arquitetura funcional do projeto-base. Os scripts de banco estão em `supabase/migrations` e usam o prefixo `pf_`, para manter as tabelas pessoais isoladas das tabelas empresariais.

Execute no SQL Editor do Supabase, nesta ordem:

1. `001_personal_finance_schema.sql`
2. `002_budget_vs_actual_view.sql`
3. `003_data_api_permissions.sql`
4. `004_commercial_saas_foundation.sql`

## Próxima integração

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O sistema ativa automaticamente autenticação, criação da família e persistência nas tabelas `pf_*`. Sem essas variáveis, permanece disponível como demonstração local.
