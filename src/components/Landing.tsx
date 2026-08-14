
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { ArrowRight, CheckCircle2, HelpCircle, Home } from 'lucide-react';
import { UserGuide } from './UserGuide';
import { COMPANY_NAME, CONSULT_LOGO_URL, PRODUCT_NAME, PRODUCT_OWNER, PRODUCT_SUBTITLE } from '../lib/brand';

interface LandingProps {
  onEnter: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onEnter }) => {
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-[-10%] left-[-10%] w-80 h-80 rounded-full blur-3xl opacity-30" style={{ backgroundColor: '#00AEEF' }}></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[32rem] h-[32rem] rounded-full blur-3xl opacity-15" style={{ backgroundColor: '#003B73' }}></div>

      <UserGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      <div className="max-w-4xl w-full text-center space-y-8 relative z-10">
        <div className="space-y-4">
          <img src={CONSULT_LOGO_URL} alt={COMPANY_NAME} className="h-20 md:h-24 w-auto max-w-64 object-contain mx-auto" />
          <div className="inline-flex items-center gap-2 family-soft-bg family-accent-text px-4 py-1.5 rounded-full text-sm font-semibold mb-2 family-brand-border border"><Home className="w-4 h-4" /> {PRODUCT_NAME} · {PRODUCT_SUBTITLE}</div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight">
            Planeje hoje. <span className="family-accent-text">Cuide da casa o ano todo.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-xl mx-auto leading-relaxed">
            Crie o orçamento familiar do próximo ano, registre receitas e despesas e acompanhe o planejado contra o realizado mês a mês.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
          {[
            "Orçamento anual por mês",
            "Receitas e despesas da família",
            "Planejado x realizado"
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-slate-700 bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-slate-200/50">
              <CheckCircle2 className="w-5 h-5 family-accent-text flex-shrink-0" />
              <span className="font-medium text-sm">{item}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button 
            size="lg" 
            onClick={onEnter}
            className="group w-full sm:w-auto px-10 h-14 text-lg family-primary-bg"
          >
            Acessar o Painel
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          
          <Button 
            variant="secondary" 
            size="lg" 
            onClick={() => setIsGuideOpen(true)}
            className="w-full sm:w-auto px-8 h-14 text-lg bg-white border-slate-200"
          >
            <HelpCircle className="mr-2 w-5 h-5 family-accent-text" />
            Como funciona?
          </Button>
        </div>
      </div>
      
      <footer className="absolute bottom-4 text-slate-500 text-xs md:text-sm font-medium text-center px-4">
        &copy; {new Date().getFullYear()} {PRODUCT_NAME} · {PRODUCT_OWNER}
      </footer>
    </div>
  );
};
