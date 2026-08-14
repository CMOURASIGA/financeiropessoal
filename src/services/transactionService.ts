import { Budget, BudgetItem, Transaction, DEFAULT_CATEGORIES, TransactionType } from '../types';
import { supabase } from '../lib/supabase';

const PREFIX = 'meular_financas';
const STORAGE_KEY = `${PREFIX}_transactions`;
const CATEGORIES_KEY = `${PREFIX}_categories`;
const BUDGETS_KEY = `${PREFIX}_budgets`;
const BUDGET_ITEMS_KEY = `${PREFIX}_budget_items`;
let householdId = localStorage.getItem(`${PREFIX}_household_id`) || '';

const read = <T,>(key: string, fallback: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
};
const write = <T,>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));
const requireHousehold = () => { if (!householdId) throw new Error('Família não configurada.'); return householdId; };
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

async function currentUserId() {
  const { data, error } = await supabase!.auth.getUser(); fail(error);
  if (!data.user) throw new Error('Usuário não autenticado.');
  return data.user.id;
}

async function categoryId(name: string, type: TransactionType) {
  const { data, error } = await supabase!.from('pf_categories').select('id').eq('household_id', requireHousehold()).eq('name', name).eq('type', type).maybeSingle();
  fail(error);
  if (data) return data.id as string;
  const inserted = await supabase!.from('pf_categories').insert({ household_id: householdId, name, type }).select('id').single();
  fail(inserted.error); return inserted.data!.id as string;
}

async function accountId(name?: string) {
  if (!name?.trim()) return null;
  const existing = await supabase!.from('pf_accounts').select('id').eq('household_id', requireHousehold()).eq('name', name.trim()).maybeSingle();
  fail(existing.error); if (existing.data) return existing.data.id as string;
  const inserted = await supabase!.from('pf_accounts').insert({ household_id: householdId, name: name.trim(), type: 'other' }).select('id').single();
  fail(inserted.error); return inserted.data!.id as string;
}

export const transactionService = {
  async initializeCloudContext(): Promise<{ id: string; name: string } | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from('pf_household_members').select('household_id, pf_households(id, name)').eq('active', true).limit(1).maybeSingle();
    fail(error);
    const household = data?.pf_households as unknown as { id: string; name: string } | null;
    if (!household) return null;
    householdId = household.id; localStorage.setItem(`${PREFIX}_household_id`, householdId);
    return household;
  },

  async getAll(): Promise<Transaction[]> {
    if (!supabase) return read<Transaction[]>(STORAGE_KEY, []);
    const { data, error } = await supabase.from('pf_transactions')
      .select('id, competence_date, type, status, description, amount, is_recurring, pf_categories(name), pf_accounts(name)')
      .eq('household_id', requireHousehold()).neq('status', 'cancelled').order('competence_date', { ascending: false });
    fail(error);
    return (data || []).map((row: any) => ({
      id: row.id, date: row.competence_date, type: row.type, category: row.pf_categories?.name || 'Outros',
      description: row.description, value: Number(row.amount), status: row.status,
      account: row.pf_accounts?.name || '', recurring: row.is_recurring
    }));
  },

  async save(transaction: Transaction): Promise<Transaction> {
    if (!supabase) {
      const transactions = read<Transaction[]>(STORAGE_KEY, []);
      const index = transactions.findIndex(t => t.id === transaction.id);
      index >= 0 ? transactions.splice(index, 1, transaction) : transactions.push(transaction);
      write(STORAGE_KEY, transactions); return transaction;
    }
    const userId = await currentUserId();
    const payload = {
      household_id: requireHousehold(), category_id: await categoryId(transaction.category, transaction.type),
      account_id: await accountId(transaction.account), member_user_id: userId, type: transaction.type,
      status: transaction.status, description: transaction.description, amount: transaction.value,
      competence_date: transaction.date, paid_at: transaction.status === 'paid' ? new Date().toISOString() : null,
      is_recurring: Boolean(transaction.recurring), notes: transaction.familyMember ? `Responsável: ${transaction.familyMember}` : null,
      created_by: userId
    };
    const { error } = await supabase.from('pf_transactions').upsert({ id: transaction.id, ...payload }, { onConflict: 'id' });
    fail(error); return transaction;
  },

  async delete(id: string): Promise<void> {
    if (!supabase) { write(STORAGE_KEY, read<Transaction[]>(STORAGE_KEY, []).filter(t => t.id !== id)); return; }
    const { error } = await supabase.from('pf_transactions').delete().eq('id', id).eq('household_id', requireHousehold()); fail(error);
  },

  async getCategories(): Promise<string[]> {
    if (!supabase) {
      const categories = read<string[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES);
      if (!localStorage.getItem(CATEGORIES_KEY)) write(CATEGORIES_KEY, categories); return categories;
    }
    const { data, error } = await supabase.from('pf_categories').select('name').eq('household_id', requireHousehold()).eq('active', true).order('sort_order');
    fail(error); return [...new Set((data || []).map(row => row.name))];
  },

  async saveCategories(categories: string[]): Promise<void> {
    if (!supabase) { write(CATEGORIES_KEY, categories); return; }
    const current = await this.getCategories();
    const missing = categories.filter(name => !current.includes(name));
    if (missing.length) {
      const { error } = await supabase.from('pf_categories').insert(missing.map(name => ({ household_id: requireHousehold(), name, type: 'expense' })));
      fail(error);
    }
  },

  async getBudget(year: number): Promise<{ budget: Budget; items: BudgetItem[] }> {
    if (!supabase) {
      const budgets = read<Budget[]>(BUDGETS_KEY, []); let budget = budgets.find(item => item.year === year);
      if (!budget) { const now = new Date().toISOString(); budget = { id: crypto.randomUUID(), year, status: 'draft', notes: '', createdAt: now, updatedAt: now }; budgets.push(budget); write(BUDGETS_KEY, budgets); }
      return { budget, items: read<BudgetItem[]>(BUDGET_ITEMS_KEY, []).filter(item => item.budgetId === budget!.id) };
    }
    let result = await supabase.from('pf_budgets').select('*').eq('household_id', requireHousehold()).eq('year', year).maybeSingle(); fail(result.error);
    if (!result.data) {
      const userId = await currentUserId();
      result = await supabase.from('pf_budgets').insert({ household_id: householdId, year, created_by: userId }).select('*').single(); fail(result.error);
    }
    const row = result.data!;
    const itemResult = await supabase.from('pf_budget_items').select('*, pf_categories(name)').eq('budget_id', row.id); fail(itemResult.error);
    const monthFields = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    return {
      budget: { id: row.id, year: row.year, status: row.status, notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at },
      items: (itemResult.data || []).map((item: any) => ({ id: item.id, budgetId: row.id, type: item.type, category: item.pf_categories?.name || 'Outros', description: item.description, monthlyValues: monthFields.map(field => Number(item[field])) }))
    };
  },

  async saveBudget(budget: Budget, items: BudgetItem[]): Promise<void> {
    if (!supabase) {
      const budgets = read<Budget[]>(BUDGETS_KEY, []); const index = budgets.findIndex(item => item.id === budget.id);
      const updated = { ...budget, updatedAt: new Date().toISOString() }; index >= 0 ? budgets.splice(index, 1, updated) : budgets.push(updated); write(BUDGETS_KEY, budgets);
      write(BUDGET_ITEMS_KEY, [...read<BudgetItem[]>(BUDGET_ITEMS_KEY, []).filter(item => item.budgetId !== budget.id), ...items]); return;
    }
    const userId = await currentUserId();
    const { error } = await supabase.from('pf_budgets').update({ status: budget.status, notes: budget.notes, approved_at: budget.status === 'approved' ? new Date().toISOString() : null, approved_by: budget.status === 'approved' ? userId : null }).eq('id', budget.id); fail(error);
    const existing = await supabase.from('pf_budget_items').select('id').eq('budget_id', budget.id); fail(existing.error);
    const nextIds = new Set(items.map(item => item.id)); const removed = (existing.data || []).map(row => row.id).filter(id => !nextIds.has(id));
    if (removed.length) { const deleted = await supabase.from('pf_budget_items').delete().in('id', removed); fail(deleted.error); }
    for (const item of items) {
      const values = item.monthlyValues;
      const payload = { id: item.id, budget_id: budget.id, category_id: await categoryId(item.category, item.type), type: item.type, description: item.description || item.category,
        jan: values[0]||0, feb: values[1]||0, mar: values[2]||0, apr: values[3]||0, may: values[4]||0, jun: values[5]||0,
        jul: values[6]||0, aug: values[7]||0, sep: values[8]||0, oct: values[9]||0, nov: values[10]||0, dec: values[11]||0 };
      const saved = await supabase.from('pf_budget_items').upsert(payload, { onConflict: 'id' }); fail(saved.error);
    }
  }
};
