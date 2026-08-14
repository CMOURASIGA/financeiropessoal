import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { commercialService, CommercialSettings, CONSULT_SERVICES_BRAND, deriveBrandPalette, HouseholdInvite, HouseholdMember, MemberRole } from '../services/commercialService';
import { PRODUCT_NAME, PRODUCT_OWNER, PRODUCT_SUBTITLE } from '../lib/brand';
import { Button } from './ui/Button';
import { Building2, CreditCard, Palette, RotateCcw, ShieldCheck, Upload, Users, X } from 'lucide-react';

type Tab = 'client' | 'users' | 'brand' | 'plan';

function extractLogoColors(file: File, callback: (primary: string, accent: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 80; canvas.height = 80;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0, 80, 80);
      const pixels = context.getImageData(0, 0, 80, 80).data;
      const colors = new Map<string, number>();
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index + 3] < 180) continue;
        const values = [pixels[index], pixels[index + 1], pixels[index + 2]].map(value => Math.min(255, Math.round(value / 24) * 24));
        if (values.reduce((sum, value) => sum + value, 0) > 690 || values.reduce((sum, value) => sum + value, 0) < 70) continue;
        const key = `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
        colors.set(key, (colors.get(key) || 0) + 1);
      }
      const ranked = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
      if (ranked[0]) callback(ranked[0], ranked[1] || ranked[0]);
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

export const CommercialSettingsModal: React.FC<{ open: boolean; onClose: () => void; onBrandUpdated: () => void }> = ({ open, onClose, onBrandUpdated }) => {
  const [tab, setTab] = useState<Tab>('client');
  const [settings, setSettings] = useState<CommercialSettings | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [invites, setInvites] = useState<HouseholdInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const canManage = settings?.role === 'owner' || settings?.role === 'admin';

  const load = async () => {
    const current = await commercialService.getSettings();
    setSettings(current);
    if (current.role === 'owner' || current.role === 'admin') {
      const data = await commercialService.getMembers(current.id);
      setMembers(data.members); setInvites(data.invites);
    }
  };
  useEffect(() => { if (open) void load().catch(error => setMessage(error.message)); }, [open]);

  const palette = useMemo(() => settings ? deriveBrandPalette(settings.branding.primaryColor, settings.branding.accentColor) : CONSULT_SERVICES_BRAND, [settings?.branding.primaryColor, settings?.branding.accentColor]);
  if (!open || !settings) return null;

  const updateBrand = (patch: Partial<CommercialSettings['branding']>) => setSettings(current => current ? ({ ...current, branding: { ...current.branding, ...patch } }) : current);
  const save = async () => {
    setMessage('');
    try {
      const next = { ...settings, branding: { ...settings.branding, sidebarColor: palette.sidebarColor, softColor: palette.softColor, contrastColor: palette.contrastColor } };
      await commercialService.updateSettings(next); setSettings(next);
      setMessage('Configurações atualizadas.'); onBrandUpdated();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'); }
  };
  const selectLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMessage('A logo deve ter no máximo 2 MB.'); return; }
    setUploading(true); setMessage('Analisando cores e enviando a logo...');
    extractLogoColors(file, (primaryColor, accentColor) => updateBrand({ primaryColor, accentColor, sidebarColor: undefined, softColor: undefined, contrastColor: undefined }));
    try {
      const logoUrl = await commercialService.uploadLogo(settings.id, file);
      updateBrand({ logoUrl }); setMessage('Logo armazenada. Confira a prévia e salve a identidade.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no envio da logo.'); }
    finally { setUploading(false); }
  };
  const restoreConsult = () => {
    setSettings({ ...settings, branding: { ...CONSULT_SERVICES_BRAND } });
    setMessage('Identidade da Consult Services restaurada na prévia. Clique em salvar para confirmar.');
  };
  const tabs = [{ id: 'client', label: 'Cliente', icon: Building2 }, { id: 'users', label: 'Usuários', icon: Users }, { id: 'brand', label: 'White label', icon: Palette }, { id: 'plan', label: 'Plano', icon: CreditCard }] as const;

  return <div className="fixed inset-0 z-50 bg-slate-950/60 p-4 overflow-y-auto"><div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
    <header className="p-5 border-b flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest family-accent-text">Administração do cliente</p><h2 className="text-2xl font-bold">{settings.name}</h2><p className="text-xs text-slate-500 mt-1">{PRODUCT_OWNER}</p></div><button onClick={onClose} className="rounded-lg border p-2"><X /></button></header>
    <div className="grid md:grid-cols-[220px_1fr] min-h-[600px]"><nav className="bg-slate-50 border-r p-3">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold mb-1 ${tab === item.id ? 'family-primary-bg' : 'text-slate-600 hover:bg-white'}`}><item.icon className="w-4 h-4" />{item.label}</button>)}</nav>
      <main className="p-6">
        {tab === 'client' && <div className="space-y-5"><h3 className="font-bold text-lg">Dados do espaço familiar</h3><label className="block text-sm font-semibold">Nome da família ou cliente<input disabled={!canManage} className="mt-1 w-full border rounded-lg p-3 font-normal" value={settings.name} onChange={event => setSettings({ ...settings, name: event.target.value })} /></label><div className="rounded-xl family-soft-bg family-brand-border border p-4 flex gap-3"><ShieldCheck className="family-accent-text" /><div><strong>Dados isolados</strong><p className="text-sm text-slate-500">Receitas, despesas e orçamento pertencem exclusivamente a este cliente.</p></div></div>{canManage && <Button onClick={save} className="family-primary-bg">Salvar dados</Button>}</div>}

        {tab === 'users' && <div className="space-y-5"><div><h3 className="font-bold text-lg">Usuários e acessos</h3><p className="text-sm text-slate-500">{members.filter(member => member.active).length} de {settings.licensedUsers} licenças utilizadas.</p></div><div className="space-y-2">{members.map(member => <div key={member.user_id} className="border rounded-xl p-3 flex items-center justify-between gap-3"><div><strong>{member.display_name}</strong><p className="text-xs text-slate-500">{member.active ? 'Ativo' : 'Suspenso'}</p></div><div className="flex gap-2"><select disabled={!canManage || member.role === 'owner'} value={member.role} onChange={async event => { await commercialService.updateMember(settings.id, member.user_id, { role: event.target.value as MemberRole }); await load(); }} className="border rounded-lg p-2 text-sm"><option value="owner">Proprietário</option><option value="admin">Administrador</option><option value="member">Membro</option><option value="viewer">Somente leitura</option></select>{canManage && member.role !== 'owner' && <button onClick={async () => { await commercialService.updateMember(settings.id, member.user_id, { active: !member.active }); await load(); }} className="text-xs font-bold text-rose-600">{member.active ? 'Suspender' : 'Reativar'}</button>}</div></div>)}</div>{canManage && <form onSubmit={async event => { event.preventDefault(); try { await commercialService.invite(settings.id, email, role); setEmail(''); setMessage('Convite criado.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha no convite.'); } }} className="grid md:grid-cols-[1fr_170px_auto] gap-2"><input required type="email" placeholder="email@exemplo.com" className="border rounded-lg p-3" value={email} onChange={event => setEmail(event.target.value)} /><select className="border rounded-lg p-3" value={role} onChange={event => setRole(event.target.value as MemberRole)}><option value="admin">Administrador</option><option value="member">Membro</option><option value="viewer">Somente leitura</option></select><Button className="family-primary-bg">Convidar</Button></form>}<div className="space-y-1">{invites.filter(invite => invite.status === 'pending').map(invite => <p key={invite.id} className="text-sm text-slate-500">Convite pendente: {invite.email} ({invite.role})</p>)}</div></div>}

        {tab === 'brand' && <div className="space-y-5"><div><h3 className="font-bold text-lg">White label do cliente</h3><p className="text-sm text-slate-500 mt-1">O {PRODUCT_NAME} permanece um produto Consult Services. A logo e as cores personalizam o ambiente do cliente.</p></div><div className="grid lg:grid-cols-[1fr_1.1fr] gap-5">
          <section className="space-y-4"><div className="border rounded-xl p-4 flex items-center gap-4 min-h-28"><div className="w-24 h-20 flex items-center justify-center rounded-xl border bg-white p-2">{settings.branding.logoUrl ? <img src={settings.branding.logoUrl} alt="Logo do cliente" className="max-w-full max-h-full object-contain" /> : <Palette />}</div><label className={`text-sm font-bold family-accent-text ${uploading ? 'opacity-50' : 'cursor-pointer'}`}><Upload className="inline w-4 h-4 mr-1" />{uploading ? 'Enviando...' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={!canManage || uploading} onChange={selectLogo} /></label></div><label className="block text-sm font-semibold">Nome do cliente exibido<input disabled={!canManage} className="mt-1 w-full border rounded-lg p-3 font-normal" value={settings.branding.displayName} onChange={event => updateBrand({ displayName: event.target.value })} /></label><div className="grid grid-cols-2 gap-4"><label className="text-sm font-semibold">Cor principal<input disabled={!canManage} type="color" className="mt-1 w-full h-12 border p-1" value={settings.branding.primaryColor} onChange={event => updateBrand({ primaryColor: event.target.value, sidebarColor: undefined, softColor: undefined, contrastColor: undefined })} /></label><label className="text-sm font-semibold">Cor de destaque<input disabled={!canManage} type="color" className="mt-1 w-full h-12 border p-1" value={settings.branding.accentColor} onChange={event => updateBrand({ accentColor: event.target.value, sidebarColor: undefined, softColor: undefined, contrastColor: undefined })} /></label></div>{canManage && <div className="flex flex-wrap gap-2"><Button disabled={uploading} onClick={save} className="family-primary-bg">Salvar identidade</Button><Button disabled={uploading} onClick={restoreConsult} variant="secondary"><RotateCcw className="w-4 h-4 mr-2" />Restaurar Consult Services</Button></div>}</section>
          <section>
            <div className="mb-2"><strong>Prévia do sistema</strong><p className="text-xs text-slate-500">Valide a aplicação da marca antes de salvar.</p></div>
            <div className="h-80 overflow-hidden rounded-2xl border shadow-sm bg-slate-100">
              <header className="h-[72px] bg-white border-b px-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-12 w-14 shrink-0 rounded-lg border bg-white p-1 flex items-center justify-center">{settings.branding.logoUrl ? <img src={settings.branding.logoUrl} alt="Logo na prévia" className="max-h-full max-w-full object-contain" /> : null}</div>
                  <div className="min-w-0"><p className="text-[6px] uppercase tracking-wider font-bold truncate" style={{ color: settings.branding.accentColor }}>{settings.branding.displayName}</p><p className="text-[11px] font-bold truncate">{PRODUCT_NAME}</p><p className="text-[6px] text-slate-500 truncate">{PRODUCT_SUBTITLE}</p><p className="text-[5px] text-slate-400 truncate">{PRODUCT_OWNER}</p></div>
                </div>
                <div className="flex items-center gap-1 shrink-0">{['Categorias', 'Configurações'].map(item => <span key={item} className="rounded border px-1.5 py-1 text-[5px] text-slate-600">{item}</span>)}<span className="rounded px-2 py-1 text-[5px] font-bold text-white" style={{ backgroundColor: settings.branding.primaryColor }}>Orçamento anual</span><span className="rounded border px-1.5 py-1 text-[5px] text-slate-600">Relatório anual</span></div>
              </header>
              <div className="p-3">
                <div className="grid grid-cols-5 gap-1.5">{['Receitas', 'Despesas', 'Reservado', 'Disponível', 'Previsto'].map((item, index) => <div key={item} className="rounded-lg border bg-white p-2"><p className="text-[5px] text-slate-500 truncate">{item}</p><strong className="text-[8px]" style={{ color: index === 1 ? '#dc2626' : settings.branding.primaryColor }}>R$ 0,00</strong></div>)}</div>
                <div className="mt-2 grid grid-cols-[2fr_1fr] gap-2">
                  <div className="rounded-lg border bg-white p-2"><strong className="text-[8px]">Filtrar lançamentos</strong><div className="grid grid-cols-3 gap-1 mt-2">{['Todos os tipos', 'Todos status', 'Categorias'].map(item => <div key={item} className="h-7 rounded border px-1.5 flex items-center text-[5px] text-slate-500">{item}</div>)}</div><div className="h-7 rounded border mt-1.5 px-2 flex items-center text-[5px] text-slate-400">Buscar por descrição...</div><div className="mt-3 flex items-center justify-between"><strong className="text-[8px]">Transações</strong><span className="text-[5px] text-slate-400">0 registros</span></div><div className="h-10 mt-1 rounded border border-dashed flex items-center justify-center text-[5px] text-slate-400">Nenhuma transação encontrada</div></div>
                  <div className="rounded-lg border bg-white p-2"><strong className="text-[8px]">Nova transação</strong><div className="grid grid-cols-2 gap-1 mt-2">{['Despesa', 'Pago / Recebido', 'Valor', 'Data'].map(item => <div key={item} className="h-7 rounded border px-1 flex items-center text-[5px] text-slate-500">{item}</div>)}</div><div className="h-7 rounded border mt-1 px-1 flex items-center text-[5px] text-slate-500">Categoria</div><div className="h-7 rounded mt-1 flex items-center justify-center text-[6px] font-bold text-white" style={{ backgroundColor: settings.branding.primaryColor }}>Salvar transação</div></div>
                </div>
              </div>
            </div>
          </section>
        </div></div>}

        {tab === 'plan' && <div className="space-y-5"><h3 className="font-bold text-lg">Plano e assinatura</h3><div className="grid sm:grid-cols-3 gap-3"><div className="border rounded-xl p-4"><span className="text-xs text-slate-500">PLANO</span><strong className="block text-xl capitalize">{settings.plan}</strong></div><div className="border rounded-xl p-4"><span className="text-xs text-slate-500">STATUS</span><strong className="block text-xl capitalize">{settings.status}</strong></div><div className="border rounded-xl p-4"><span className="text-xs text-slate-500">USUÁRIOS</span><strong className="block text-xl">{settings.licensedUsers}</strong></div></div><p className="text-sm text-slate-500">A contratação e alteração do plano serão vinculadas ao meio de pagamento na próxima etapa comercial.</p></div>}
        {message && <p className="mt-5 p-3 rounded-lg family-soft-bg family-accent-text text-sm">{message}</p>}
      </main></div>
  </div></div>;
};
