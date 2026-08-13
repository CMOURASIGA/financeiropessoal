import { Budget, BudgetItem, DEFAULT_CATEGORIES, Transaction } from '../types';

export const DEMO_MODE = true;
const PREFIX = 'meular_financas';
const DEMO_VERSION = '1';
const VERSION_KEY = `${PREFIX}_demo_version`;
const keys = {
  transactions: `${PREFIX}_transactions`,
  categories: `${PREFIX}_categories`,
  budgets: `${PREFIX}_budgets`,
  budgetItems: `${PREFIX}_budget_items`,
  household: `${PREFIX}_household_id`
};

const isoDate = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export function seedDemoData(force = false) {
  if (!force && localStorage.getItem(VERSION_KEY) === DEMO_VERSION) return;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const nextYear = year + 1;
  const budgetId = 'demo-budget-next-year';
  const transactions: Transaction[] = [
    { id: 'demo-01', date: isoDate(year, month, 5), type: 'income', category: 'Salários e Pró-labore', description: 'Salário mensal', value: 8500, status: 'paid', familyMember: 'Responsável principal', account: 'Conta principal', recurring: true },
    { id: 'demo-02', date: isoDate(year, month, 7), type: 'income', category: 'Outras receitas', description: 'Renda complementar', value: 1800, status: 'paid', familyMember: 'Família', account: 'Conta principal' },
    { id: 'demo-03', date: isoDate(year, month, 8), type: 'expense', category: 'Moradia', description: 'Condomínio', value: 950, status: 'paid', account: 'Conta principal', recurring: true },
    { id: 'demo-04', date: isoDate(year, month, 10), type: 'expense', category: 'Alimentação', description: 'Compras do mês', value: 1450, status: 'paid', account: 'Cartão da família' },
    { id: 'demo-05', date: isoDate(year, month, 12), type: 'expense', category: 'Educação', description: 'Mensalidade escolar', value: 1650, status: 'reserved', recurring: true },
    { id: 'demo-06', date: isoDate(year, month, 15), type: 'expense', category: 'Saúde', description: 'Plano de saúde', value: 980, status: 'pending', recurring: true },
    { id: 'demo-07', date: isoDate(year, month, 18), type: 'expense', category: 'Transporte', description: 'Combustível e transporte', value: 620, status: 'pending' },
    { id: 'demo-08', date: isoDate(year, month, 20), type: 'expense', category: 'Investimentos e reservas', description: 'Reserva familiar', value: 1200, status: 'reserved', account: 'Investimentos' }
  ];
  const budget: Budget = { id: budgetId, year: nextYear, status: 'draft', notes: 'Orçamento demonstrativo para o próximo ano.', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const monthly = (value: number) => Array(12).fill(value);
  const budgetItems: BudgetItem[] = [
    { id: 'demo-bi-01', budgetId, type: 'income', category: 'Salários e Pró-labore', description: 'Receita familiar', monthlyValues: monthly(9000) },
    { id: 'demo-bi-02', budgetId, type: 'income', category: 'Outras receitas', description: 'Receitas complementares', monthlyValues: monthly(1500) },
    { id: 'demo-bi-03', budgetId, type: 'expense', category: 'Moradia', description: 'Moradia e condomínio', monthlyValues: monthly(2200) },
    { id: 'demo-bi-04', budgetId, type: 'expense', category: 'Alimentação', description: 'Alimentação da família', monthlyValues: monthly(1700) },
    { id: 'demo-bi-05', budgetId, type: 'expense', category: 'Educação', description: 'Educação', monthlyValues: monthly(1650) },
    { id: 'demo-bi-06', budgetId, type: 'expense', category: 'Saúde', description: 'Saúde e bem-estar', monthlyValues: monthly(1100) },
    { id: 'demo-bi-07', budgetId, type: 'expense', category: 'Investimentos e reservas', description: 'Reserva planejada', monthlyValues: monthly(1200) }
  ];
  localStorage.setItem(keys.transactions, JSON.stringify(transactions));
  localStorage.setItem(keys.categories, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(keys.budgets, JSON.stringify([budget]));
  localStorage.setItem(keys.budgetItems, JSON.stringify(budgetItems));
  localStorage.setItem(keys.household, 'demo-local');
  localStorage.setItem(VERSION_KEY, DEMO_VERSION);
}

export function resetDemoData() {
  Object.values(keys).forEach(key => localStorage.removeItem(key));
  localStorage.removeItem(VERSION_KEY);
  seedDemoData(true);
  window.location.reload();
}
