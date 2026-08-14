export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'paid' | 'pending' | 'reserved';
export type BudgetStatus = 'draft' | 'approved' | 'closed';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  category: string;
  description: string;
  value: number;
  status: TransactionStatus;
  familyMember?: string;
  account?: string;
  recurring?: boolean;
}

export interface Budget {
  id: string;
  year: number;
  status: BudgetStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  type: TransactionType;
  category: string;
  description: string;
  monthlyValues: number[];
}

export interface FilterState {
  type: 'all' | TransactionType;
  status: 'all' | TransactionStatus;
  category: string;
  minValue: string;
  maxValue: string;
  search: string;
}

export interface SummaryStats {
  income: number;
  expensesPaid: number;
  expensesReserved: number;
  expensesPending: number;
  balanceExpected: number;
  balanceRealized: number;
  balanceAvailable: number;
}

export const DEFAULT_CATEGORIES = [
  'Salários e Pró-labore', 'Outras receitas', 'Moradia', 'Alimentação', 'Saúde',
  'Educação', 'Transporte', 'Comunicação', 'Seguros', 'Lazer e esportes',
  'Impostos e taxas', 'Investimentos e reservas', 'Cartões de crédito', 'Outros'
];
