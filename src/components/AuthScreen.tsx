import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/Button';
import { Home, LockKeyhole, Mail } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setMessage('');
    const result = mode === 'login'
      ? await supabase!.auth.signInWithPassword({ email, password })
      : await supabase!.auth.signUp({ email, password, options: { data: { display_name: name } } });
    if (result.error) setMessage(result.error.message);
    else if (mode === 'signup' && !result.data.session) setMessage('Cadastro criado. Confirme seu e-mail para entrar.');
    setLoading(false);
  };

  return <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
    <section className="hidden lg:flex bg-slate-900 text-white p-14 flex-col justify-between">
      <div className="flex items-center gap-3"><div className="bg-emerald-500 p-3 rounded-2xl"><Home /></div><strong className="text-2xl">MeuLar Finanças</strong></div>
      <div><p className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Planejamento familiar</p><h1 className="text-5xl font-bold leading-tight mt-4">Orçamento e rotina financeira em um só lugar.</h1><p className="text-slate-300 text-lg mt-5">Planeje o próximo ano, registre o realizado e veja com clareza como está a vida financeira da família.</p></div>
      <p className="text-slate-500 text-sm">Seus dados ficam protegidos por família e usuário.</p>
    </section>
    <section className="flex items-center justify-center p-6"><form onSubmit={submit} className="bg-white rounded-2xl shadow-xl border p-8 w-full max-w-md space-y-5">
      <div className="lg:hidden flex items-center gap-2 text-emerald-700"><Home /><strong>MeuLar Finanças</strong></div>
      <div><h2 className="text-2xl font-bold">{mode === 'login' ? 'Entrar na sua conta' : 'Criar sua conta'}</h2><p className="text-slate-500 text-sm mt-1">Use seu e-mail para acessar os dados da família.</p></div>
      {mode === 'signup' && <label className="block text-sm font-semibold">Seu nome<input required className="mt-1 w-full border rounded-lg px-3 py-3 font-normal" value={name} onChange={e => setName(e.target.value)} /></label>}
      <label className="block text-sm font-semibold">E-mail<div className="relative mt-1"><Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="email" required className="w-full border rounded-lg pl-10 pr-3 py-3 font-normal" value={email} onChange={e => setEmail(e.target.value)} /></div></label>
      <label className="block text-sm font-semibold">Senha<div className="relative mt-1"><LockKeyhole className="absolute left-3 top-3 w-5 h-5 text-slate-400"/><input type="password" minLength={6} required className="w-full border rounded-lg pl-10 pr-3 py-3 font-normal" value={password} onChange={e => setPassword(e.target.value)} /></div></label>
      {message && <p className="text-sm rounded-lg bg-amber-50 text-amber-800 p-3">{message}</p>}
      <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" disabled={loading}>{loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}</Button>
      <button type="button" className="w-full text-sm text-emerald-700 font-semibold" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho uma conta'}</button>
    </form></section>
  </div>;
};
