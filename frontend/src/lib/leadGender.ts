import type { AppThemeId } from '@/lib/themeMapping';
import type { Lead } from '@/types/lead';

export type LeadGender = 'male' | 'female';
export type LeadPersonaVariant = 'black' | 'with';

/** Nomes femininos comuns (pt-BR) — primeiro nome, sem acento. */
const FEMALE_NAMES = new Set([
  'ana', 'maria', 'mariana', 'juliana', 'fernanda', 'patricia', 'patrícia',
  'camila', 'beatriz', 'gabriela', 'raquel', 'carla', 'paula', 'renata',
  'amanda', 'bruna', 'larissa', 'isabela', 'helena', 'aline', 'andrea',
  'barbara', 'bianca', 'carolina', 'catarina', 'claudia', 'cristina',
  'daniela', 'debora', 'débora', 'elisa', 'fabiana', 'flavia', 'flávia',
  'gisele', 'heloisa', 'heloísa', 'ingrid', 'ivone', 'janaina', 'janaína',
  'jessica', 'jéssica', 'joana', 'joyce', 'julia', 'júlia', 'karina',
  'karen', 'lais', 'laís', 'larissa', 'letícia', 'leticia', 'livia', 'lívia',
  'luana', 'luciana', 'luiza', 'luíza', 'marcia', 'márcia', 'marina',
  'melissa', 'michelle', 'milena', 'monica', 'mônica', 'nadia', 'nádia',
  'natalia', 'natália', 'nicole', 'priscila', 'rafaela', 'regina', 'renata',
  'roberta', 'sabrina', 'samara', 'sandra', 'silvia', 'sílvia', 'simone',
  'sonia', 'sônia', 'stephanie', 'stefany', 'sueli', 'suzana', 'tamires',
  'tatiana', 'thais', 'thaís', 'valeria', 'valéria', 'vanessa', 'vera',
  'veronica', 'verônica', 'vitoria', 'vitória', 'yasmin', 'yasmim',
]);

/** Nomes masculinos comuns (pt-BR). */
const MALE_NAMES = new Set([
  'joao', 'joão', 'jose', 'josé', 'carlos', 'paulo', 'pedro', 'lucas',
  'marcos', 'rafael', 'bruno', 'gustavo', 'felipe', 'rodrigo', 'andre',
  'andré', 'antonio', 'antônio', 'marcelo', 'ricardo', 'fernando', 'fabio',
  'fábio', 'diego', 'eduardo', 'henrique', 'guilherme', 'leonardo', 'matheus',
  'mateus', 'vinicius', 'vinícius', 'samuel', 'daniel', 'gabriel', 'igor',
  'caio', 'renato', 'thiago', 'wagner', 'otavio', 'otávio', 'nicolas',
  'augusto', 'bernardo', 'cesar', 'césar', 'claudio', 'cláudio', 'cristiano',
  'davi', 'emerson', 'enzo', 'erick', 'everton', 'fabiano', 'flavio', 'flávio',
  'francisco', 'gilberto', 'heitor', 'hugo', 'italo', 'ítalo', 'jefferson',
  'jonas', 'jorge', 'julio', 'júlio', 'kleber', 'leandro', 'luan', 'luis',
  'luís', 'mauricio', 'maurício', 'miguel', 'murilo', 'nelson', 'osvaldo',
  'pablo', 'patrick', 'renan', 'roberto', 'romulo', 'rômulo', 'sergio',
  'sérgio', 'tiago', 'tomás', 'tomas', 'victor', 'víctor', 'wesley', 'william',
]);

/** Termina em «a», mas costuma ser masculino no Brasil. */
const MALE_A_ENDING = new Set([
  'lucas', 'nicolas', 'nikolas', 'matias', 'elias', 'jonas', 'thomas',
  'andreas', 'nikita', 'joshua', 'ezra', 'barnabas', 'lazaro', 'lázaro',
]);

/** Termina em «o», mas costuma ser feminino. */
const FEMALE_O_ENDING = new Set(['consuelo']);

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

export function normalizeLeadFirstName(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') ?? ''
  );
}

/**
 * Infere gênero pelo primeiro nome (listas pt-BR + heurística de terminação).
 * Retorna `null` se não for possível inferir com confiança.
 */
export function inferLeadGenderFromName(name: string): LeadGender | null {
  const first = normalizeLeadFirstName(name);
  if (!first) return null;

  if (FEMALE_NAMES.has(first)) return 'female';
  if (MALE_NAMES.has(first)) return 'male';
  if (MALE_A_ENDING.has(first)) return 'male';
  if (FEMALE_O_ENDING.has(first)) return 'female';

  if (first.length >= 3 && first.endsWith('a')) return 'female';
  if (first.length >= 3 && first.endsWith('o') && !FEMALE_O_ENDING.has(first)) return 'male';

  return null;
}

export function getLeadGender(lead: Pick<Lead, 'name' | 'gender'>): LeadGender {
  if (lead.gender === 'male' || lead.gender === 'female') return lead.gender;
  return inferLeadGenderFromName(lead.name) ?? 'male';
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

/** Anel sutil no avatar do card conforme gênero inferido. */
export function getLeadGenderAvatarRing(gender: LeadGender): string {
  return gender === 'female'
    ? 'ring-rose-400/35 dark:ring-rose-400/25'
    : 'ring-sky-400/35 dark:ring-sky-400/25';
}
