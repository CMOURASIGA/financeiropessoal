import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Home } from 'lucide-react';

export const HouseholdSetup: React.FC<{ defaultName: string; onCreated: () => void }> = ({ defaultName, onCreated }) => {
  const [household, setHousehold] = useState('Minha Família');
  const [owner, setOwner] = useState(defaultName);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const { error: rpcError } = await supabase!.rpc('pf_create_household', { household_name: household, owner_name: owner });
    if (rpcError) setError(rpcError.message); else onCreated();
    setLoading(false);
  };
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><form onSubmit={submit} className="bg-white border shadow-xl rounded-2xl p-8 w-full max-w-lg space-y-5">
    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Home /></div>
    <div><h1 className="text-2xl font-bold">Configure sua família</h1><p className="text-slate-500 mt-1">Esse espaço separa e protege as informações financeiras da sua casa.</p></div>
    <label className="block text-sm font-semibold">Nome da família<input required className="mt-1 w-full border rounded-lg px-3 py-3 font-normal" value={household} onChange={e => setHousehold(e.target.value)} /></label>
    <label className="block text-sm font-semibold">Seu nome<input required className="mt-1 w-full border rounded-lg px-3 py-3 font-normal" value={owner} onChange={e => setOwner(e.target.value)} /></label>
    {error && <p className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</p>}
    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>{loading ? 'Criando...' : 'Criar espaço familiar'}</Button>
  </form></div>;
};
