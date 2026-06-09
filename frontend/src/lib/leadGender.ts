import type { AppThemeId } from '@/lib/themeMapping';
import type { Lead } from '@/types/lead';

export type LeadGender = 'male' | 'female';
export type LeadPersonaVariant = 'black' | 'with';

const FEMALE_NAMES = new Set([
  'ana',
  'mariana',
  'fernanda',
  'luciana',
  'juliana',
  'patricia',
  'camila',
  'beatriz',
  'gabriela',
  'raquel',
  'carla',
  'paula',
  'renata',
  'amanda',
  'bruna',
]);

const MALE_NAMES = new Set([
  'carlos',
  'roberto',
  'joão',
  'joao',
  'pedro',
  'lucas',
  'marcos',
  'rafael',
  'bruno',
  'gustavo',
  'felipe',
  'ricardo',
  'eduardo',
]);

export const LEAD_MALE_PERSONA_BLACK = '/assets/men-black.webp';
export const LEAD_FEMALE_PERSONA_BLACK = '/assets/female-black.webp';
export const LEAD_MALE_PERSONA_WITH = '/assets/men-with.webp';
export const LEAD_FEMALE_PERSONA_WITH = '/assets/female-with.webp';
/** @deprecated Use `getLeadPersonaSrc` com variante explícita. */
export const LEAD_MALE_PERSONA = LEAD_MALE_PERSONA_WITH;
/** @deprecated Use `getLeadPersonaSrc` com variante explícita. */
export const LEAD_FEMALE_PERSONA = LEAD_FEMALE_PERSONA_WITH;
export const LEAD_MALE_ICON = '/assets/logo-gen-sem-fundo-svg.svg';

const BRAND_ICON_FILTER =
  'brightness(0) saturate(100%) invert(55%) sepia(89%) saturate(2148%) hue-rotate(138deg) brightness(91%) contrast(96%)';

export function getLeadGender(lead: Pick<Lead, 'name' | 'gender'>): LeadGender {
  if (lead.gender === 'male' || lead.gender === 'female') return lead.gender;
  const first = lead.name.trim().split(/\s+/)[0]?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
  if (FEMALE_NAMES.has(first)) return 'female';
  if (MALE_NAMES.has(first)) return 'male';
  return 'male';
}

export function getLeadPersonaVariantForTheme(theme: AppThemeId): LeadPersonaVariant {
  return theme === 'light' ? 'with' : 'black';
}

export function getLeadPersonaSrc(gender: LeadGender, variant: LeadPersonaVariant = 'with'): string {
  if (variant === 'black') {
    return gender === 'female' ? LEAD_FEMALE_PERSONA_BLACK : LEAD_MALE_PERSONA_BLACK;
  }
  return gender === 'female' ? LEAD_FEMALE_PERSONA_WITH : LEAD_MALE_PERSONA_WITH;
}

export function getLeadMaleIconFilter(): string {
  return BRAND_ICON_FILTER;
}
