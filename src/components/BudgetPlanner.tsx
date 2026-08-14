import React, { useEffect, useMemo, useState } from 'react';
import { Budget, BudgetItem, Transaction, TransactionType } from '../types';
import { transactionService } from '../services/transactionService';
import { formatCurrency } from '../utils/formatters';
import { Button } from './ui/Button';
import { Check, Copy, Plus, Save, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  transactions: Transaction[];
}

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const BudgetPlanner: React.FC<Props> = ({ isOpen, onClose, categories, transactions }) => {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    transactionService.getBudget(year).then(data => { setBudget(data.budget); setItems(data.items); });
  }, [isOpen, year]);

  const addItem = (type: TransactionType) => {
    if (!budget) return;
    setItems(current => [...current, {
      id: crypto.randomUUID(), budgetId: budget.id, type,
      category: type === 'income' ? 'Salários e Pró-labore' : 'Moradia',
      description: '', monthlyValues: Array(12).fill(0)
    }]);
  };

  const updateItem = (id: string, patch: Partial<BudgetItem>) =>
    setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item));

  const copyFirstMonth = (item: BudgetItem) =>
    updateItem(item.id, { monthlyValues: Array(12).fill(item.monthlyValues[0] || 0) });

  const totals = useMemo(() => {
    const sum = (type: TransactionType, month?: number) => items
      .filter(item => item.type === type)
      .reduce((total, item) => total + (month === undefined
        ? item.monthlyValues.reduce((a, b) => a + Number(b || 0), 0)
        : Number(item.monthlyValues[month] || 0)), 0);
    return {
      income: months.map((_, month) => sum('income', month)),
      expense: months.map((_, month) => sum('expense', month)),
      annualIncome: sum('income'), annualExpense: sum('expense')
    };
  }, [items]);

  const realized = useMemo(() => {
    const values = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
    transactions.filter(t => new Date(`${t.date}T12:00:00`).getFullYear() === year && t.status === 'paid')
      .forEach(t => { values[new Date(`${t.date}T12:00:00`).getMonth()][t.type] += t.value; });
    return values;
  }, [transactions, year]);

  if (!isOpen || !budget) return null;

  const save = async (status = budget.status) => {
    const updated = { ...budget, status };
    await transactionService.saveBudget(updated, items);
    setBudget(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm p-3 md:p-6 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        <header className="p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Planejamento familiar</p>
            <h2 className="text-2xl font-bold text-slate-900">Orçamento anual {year}</h2>
            <p className="text-sm text-slate-500">Planeje o ano seguinte e acompanhe orçamento x realizado.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="border rounded-lg px-3 py-2 bg-white font-semibold">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(value => <option key={value}>{value}</option>)}
            </select>
            <Button variant="secondary" onClick={() => addItem('income')}><Plus className="w-4 h-4 mr-1" /> Receita</Button>
            <Button variant="secondary" onClick={() => addItem('expense')}><Plus className="w-4 h-4 mr-1" /> Despesa</Button>
            <Button onClick={() => save()}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
            {budget.status === 'draft' && <Button onClick={() => save('approved')} className="bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4 mr-1" /> Aprovar</Button>}
            <Button variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 bg-white">
          <div className="rounded-xl bg-emerald-50 p-4"><span className="text-xs font-bold text-emerald-700">RECEITA PREVISTA</span><strong className="block text-2xl text-emerald-800">{formatCurrency(totals.annualIncome)}</strong></div>
          <div className="rounded-xl bg-rose-50 p-4"><span className="text-xs font-bold text-rose-700">DESPESA PREVISTA</span><strong className="block text-2xl text-rose-800">{formatCurrency(totals.annualExpense)}</strong></div>
          <div className="rounded-xl bg-blue-50 p-4"><span className="text-xs font-bold text-blue-700">SALDO PREVISTO</span><strong className="block text-2xl text-blue-800">{formatCurrency(totals.annualIncome - totals.annualExpense)}</strong></div>
        </div>

        <div className="overflow-x-auto px-5 pb-6">
          <table className="w-full text-xs min-w-[1450px] border-separate border-spacing-0">
            <thead><tr className="bg-slate-100 text-slate-600">
              <th className="text-left p-3 sticky left-0 bg-slate-100 z-10 min-w-44">Descrição</th><th className="p-3 min-w-40">Categoria</th>
              {months.map(m => <th key={m} className="p-3 text-right min-w-24">{m}</th>)}<th className="p-3 text-right min-w-28">Total</th><th className="p-3">Ações</th>
            </tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b ${item.type === 'income' ? 'bg-emerald-50/30' : 'bg-rose-50/30'}`}>
                  <td className="p-2 sticky left-0 bg-white"><input className="w-full border rounded px-2 py-2" placeholder={item.type === 'income' ? 'Ex: Salário' : 'Ex: Condomínio'} value={item.description} onChange={e => updateItem(item.id, { description: e.target.value })} /></td>
                  <td className="p-2"><select className="w-full border rounded px-2 py-2" value={item.category} onChange={e => updateItem(item.id, { category: e.target.value })}>{categories.map(c => <option key={c}>{c}</option>)}</select></td>
                  {item.monthlyValues.map((value, month) => <td className="p-1" key={month}><input type="number" min="0" step="0.01" className="w-full text-right border rounded px-2 py-2" value={value || ''} onChange={e => { const next = [...item.monthlyValues]; next[month] = Number(e.target.value); updateItem(item.id, { monthlyValues: next }); }} /></td>)}
                  <td className="p-2 text-right font-bold">{formatCurrency(item.monthlyValues.reduce((a, b) => a + Number(b || 0), 0))}</td>
                  <td className="p-2"><div className="flex"><button title="Repetir janeiro" onClick={() => copyFirstMonth(item)} className="p-2 text-blue-600"><Copy className="w-4 h-4" /></button><button title="Excluir" onClick={() => setItems(current => current.filter(i => i.id !== item.id))} className="p-2 text-rose-600"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={16} className="p-10 text-center text-slate-400">Inclua as receitas e despesas previstas para começar o orçamento.</td></tr>}
              <tr className="font-bold bg-emerald-100"><td className="p-3 sticky left-0 bg-emerald-100" colSpan={2}>TOTAL RECEITAS</td>{totals.income.map((v, i) => <td key={i} className="p-3 text-right">{formatCurrency(v)}</td>)}<td className="p-3 text-right">{formatCurrency(totals.annualIncome)}</td><td /></tr>
              <tr className="font-bold bg-rose-100"><td className="p-3 sticky left-0 bg-rose-100" colSpan={2}>TOTAL DESPESAS</td>{totals.expense.map((v, i) => <td key={i} className="p-3 text-right">{formatCurrency(v)}</td>)}<td className="p-3 text-right">{formatCurrency(totals.annualExpense)}</td><td /></tr>
              <tr className="font-bold bg-slate-800 text-white"><td className="p-3 sticky left-0 bg-slate-800" colSpan={2}>SALDO ORÇADO</td>{months.map((_, i) => <td key={i} className="p-3 text-right">{formatCurrency(totals.income[i] - totals.expense[i])}</td>)}<td className="p-3 text-right">{formatCurrency(totals.annualIncome - totals.annualExpense)}</td><td /></tr>
              <tr className="font-semibold bg-blue-50"><td className="p-3 sticky left-0 bg-blue-50" colSpan={2}>SALDO REALIZADO</td>{realized.map((v, i) => <td key={i} className="p-3 text-right">{formatCurrency(v.income - v.expense)}</td>)}<td className="p-3 text-right">{formatCurrency(realized.reduce((sum, v) => sum + v.income - v.expense, 0))}</td><td /></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
