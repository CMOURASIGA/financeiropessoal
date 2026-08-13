import { supabase } from '../lib/supabase';

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type HouseholdBrand = { displayName: string; logoUrl: string; primaryColor: string; accentColor: string };
export type CommercialSettings = {
  id: string; name: string; status: string; plan: string; licensedUsers: number;
  trialEndsAt?: string; subscriptionEndsAt?: string; role: MemberRole; branding: HouseholdBrand;
};
export type HouseholdMember = { user_id: string; display_name: string; role: MemberRole; active: boolean };
export type HouseholdInvite = { id: string; email: string; role: MemberRole; status: string; expires_at: string };

const defaults: HouseholdBrand = { displayName: 'MeuLar Finanças', logoUrl: '', primaryColor: '#059669', accentColor: '#0f766e' };
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

async function membership() {
  const result = await supabase!.from('pf_household_members').select('household_id, role').eq('active', true).limit(1).single();
  fail(result.error); return result.data as { household_id: string; role: MemberRole };
}

export function applyBrand(brand?: Partial<HouseholdBrand>) {
  const value = { ...defaults, ...brand };
  document.documentElement.style.setProperty('--family-primary', value.primaryColor);
  document.documentElement.style.setProperty('--family-accent', value.accentColor);
  return value;
}

export const commercialService = {
  async acceptInvites() { if (supabase) await supabase.rpc('pf_accept_pending_invites'); },
  async getSettings(): Promise<CommercialSettings> {
    const member = await membership();
    const result = await supabase!.from('pf_households').select('id,name,status,plan,licensed_users,trial_ends_at,subscription_ends_at,branding').eq('id', member.household_id).single();
    fail(result.error); const row: any = result.data;
    return { id: row.id, name: row.name, status: row.status, plan: row.plan, licensedUsers: row.licensed_users,
      trialEndsAt: row.trial_ends_at, subscriptionEndsAt: row.subscription_ends_at, role: member.role,
      branding: applyBrand(row.branding) };
  },
  async updateSettings(settings: CommercialSettings) {
    const result = await supabase!.from('pf_households').update({ name: settings.name, branding: settings.branding }).eq('id', settings.id);
    fail(result.error); applyBrand(settings.branding);
  },
  async uploadLogo(householdId: string, file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${householdId}/logo-${Date.now()}.${extension}`;
    const result = await supabase!.storage.from('pf-brand-assets').upload(path, file, { upsert: true }); fail(result.error);
    return supabase!.storage.from('pf-brand-assets').getPublicUrl(path).data.publicUrl;
  },
  async getMembers(householdId: string) {
    const [members, invites] = await Promise.all([
      supabase!.from('pf_household_members').select('user_id,display_name,role,active').eq('household_id', householdId).order('created_at'),
      supabase!.from('pf_household_invites').select('id,email,role,status,expires_at').eq('household_id', householdId).order('created_at', { ascending: false })
    ]);
    fail(members.error); fail(invites.error);
    return { members: (members.data || []) as HouseholdMember[], invites: (invites.data || []) as HouseholdInvite[] };
  },
  async invite(householdId: string, email: string, role: MemberRole) {
    const result = await supabase!.rpc('pf_invite_member', { target_household: householdId, target_email: email, target_role: role }); fail(result.error);
  },
  async updateMember(householdId: string, userId: string, patch: Partial<Pick<HouseholdMember, 'role' | 'active'>>) {
    const result = await supabase!.from('pf_household_members').update(patch).eq('household_id', householdId).eq('user_id', userId); fail(result.error);
  }
};
