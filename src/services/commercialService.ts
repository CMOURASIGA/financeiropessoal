import { supabase } from '../lib/supabase';
import { COMPANY_NAME, CONSULT_LOGO_URL } from '../lib/brand';

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';
export type HouseholdBrand = {
  displayName: string; logoUrl: string; primaryColor: string; accentColor: string;
  sidebarColor?: string; softColor?: string; contrastColor?: string;
};
export type CommercialSettings = {
  id: string; name: string; status: string; plan: string; licensedUsers: number;
  trialEndsAt?: string; subscriptionEndsAt?: string; role: MemberRole; branding: HouseholdBrand;
};
export type HouseholdMember = { user_id: string; display_name: string; role: MemberRole; active: boolean };
export type HouseholdInvite = { id: string; email: string; role: MemberRole; status: string; expires_at: string };

export const CONSULT_SERVICES_BRAND: HouseholdBrand = {
  displayName: COMPANY_NAME, logoUrl: CONSULT_LOGO_URL, primaryColor: '#003B73', accentColor: '#00AEEF',
  sidebarColor: '#002C55', softColor: '#E1F4FC', contrastColor: '#FFFFFF'
};
const defaults = CONSULT_SERVICES_BRAND;
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

const normalizeHex = (value: string | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(value || '') ? value!.toUpperCase() : fallback;
const rgb = (color: string) => { const value = normalizeHex(color, '#003B73').slice(1); return [0, 2, 4].map(index => Number.parseInt(value.slice(index, index + 2), 16)); };
const hex = (values: number[]) => `#${values.map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const mix = (color: string, target: string, amount: number) => { const source = rgb(color); const destination = rgb(target); return hex(source.map((value, index) => value + (destination[index] - value) * amount)); };

export function deriveBrandPalette(primaryColor: string, accentColor: string): HouseholdBrand {
  const primary = normalizeHex(primaryColor, defaults.primaryColor);
  const accent = normalizeHex(accentColor, defaults.accentColor);
  const [red, green, blue] = rgb(primary);
  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
  return {
    displayName: defaults.displayName, logoUrl: defaults.logoUrl, primaryColor: primary, accentColor: accent,
    sidebarColor: mix(primary, '#111827', luminance > 0.45 ? 0.68 : 0.38),
    softColor: mix(primary, '#FFFFFF', 0.9), contrastColor: luminance > 0.58 ? '#172033' : '#FFFFFF'
  };
}

export function completeBrand(brand?: Partial<HouseholdBrand>) {
  const value = { ...defaults, ...brand };
  const palette = deriveBrandPalette(value.primaryColor, value.accentColor);
  return { ...value, sidebarColor: value.sidebarColor || palette.sidebarColor, softColor: value.softColor || palette.softColor, contrastColor: value.contrastColor || palette.contrastColor };
}

async function membership() {
  const result = await supabase!.from('pf_household_members').select('household_id, role').eq('active', true).limit(1).single();
  fail(result.error); return result.data as { household_id: string; role: MemberRole };
}

export function applyBrand(brand?: Partial<HouseholdBrand>) {
  const value = completeBrand(brand);
  const root = document.documentElement.style;
  root.setProperty('--family-primary', value.primaryColor);
  root.setProperty('--family-accent', value.accentColor);
  root.setProperty('--family-sidebar', value.sidebarColor!);
  root.setProperty('--family-soft', value.softColor!);
  root.setProperty('--family-contrast', value.contrastColor!);
  root.setProperty('--family-border', mix(value.primaryColor, '#FFFFFF', 0.65));
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
