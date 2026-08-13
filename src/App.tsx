import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Landing } from './components/Landing';
import { Dashboard } from './components/Dashboard';
import { AuthScreen } from './components/AuthScreen';
import { HouseholdSetup } from './components/HouseholdSetup';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { transactionService } from './services/transactionService';

type ViewState = 'landing' | 'dashboard';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);

  const loadHousehold = async (currentUser: User) => {
    const result = await transactionService.initializeCloudContext();
    setHousehold(result);
    setUser(currentUser);
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) loadHousehold(data.session.user);
      else setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) window.setTimeout(() => loadHousehold(session.user), 0);
      else { setUser(null); setHousehold(null); setLoading(false); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando MeuLar Finanças...</div>;
  if (isSupabaseConfigured && !user) return <AuthScreen />;
  if (isSupabaseConfigured && user && !household) return <HouseholdSetup defaultName={String(user.user_metadata?.display_name || user.email?.split('@')[0] || '')} onCreated={() => loadHousehold(user)} />;

  return <>
    {currentView === 'landing' && <Landing onEnter={() => setCurrentView('dashboard')} />}
    {currentView === 'dashboard' && <Dashboard householdName={household?.name} onSignOut={supabase ? () => supabase.auth.signOut() : undefined} />}
  </>;
}

export default App;
