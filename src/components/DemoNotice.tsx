import React from 'react';
import { Database, RotateCcw, ShieldAlert } from 'lucide-react';
import { resetDemoData } from '../lib/demo';

export const DemoNotice: React.FC = () => <div className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-2.5">
  <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
    <div className="flex items-start sm:items-center gap-2"><ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" /><div><strong className="text-sm">Versão de demonstração</strong><p className="text-xs text-amber-800"><Database className="inline w-3 h-3 mr-1" />Os dados ficam somente neste navegador e não são compartilhados com outras máquinas.</p></div></div>
    <button onClick={() => confirm('Restaurar todos os dados originais da demonstração?') && resetDemoData()} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100"><RotateCcw className="w-3.5 h-3.5" />Restaurar demonstração</button>
  </div>
</div>;

