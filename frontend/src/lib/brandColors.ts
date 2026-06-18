/** 20 cores de marca para empreendimentos (token salvo no Neon + hex para UI). */
export const EMPREENDIMENTO_COLOR_OPTIONS = [
  { token: 'teal500', hex: '#14b8a6' },
  { token: 'sky500', hex: '#0ea5e9' },
  { token: 'blue500', hex: '#3b82f6' },
  { token: 'indigo500', hex: '#6366f1' },
  { token: 'violet500', hex: '#8b5cf6' },
  { token: 'purple500', hex: '#a855f7' },
  { token: 'fuchsia500', hex: '#d946ef' },
  { token: 'pink500', hex: '#ec4899' },
  { token: 'rose500', hex: '#f43f5e' },
  { token: 'red500', hex: '#ef4444' },
  { token: 'orange500', hex: '#f97316' },
  { token: 'amber500', hex: '#f59e0b' },
  { token: 'yellow500', hex: '#eab308' },
  { token: 'lime500', hex: '#84cc16' },
  { token: 'green500', hex: '#22c55e' },
  { token: 'emerald500', hex: '#10b981' },
  { token: 'cyan500', hex: '#06b6d4' },
  { token: 'slate500', hex: '#64748b' },
  { token: 'gray500', hex: '#6b7280' },
  { token: 'stone500', hex: '#78716c' },
] as const;

export type EmpreendimentoColorToken = (typeof EMPREENDIMENTO_COLOR_OPTIONS)[number]['token'];

export const DEFAULT_EMPREENDIMENTO_COLOR: EmpreendimentoColorToken = 'teal500';

const TOKEN_TO_TAILWIND: Record<EmpreendimentoColorToken, string> = {
  teal500: 'bg-teal-500',
  sky500: 'bg-sky-500',
  blue500: 'bg-blue-500',
  indigo500: 'bg-indigo-500',
  violet500: 'bg-violet-500',
  purple500: 'bg-purple-500',
  fuchsia500: 'bg-fuchsia-500',
  pink500: 'bg-pink-500',
  rose500: 'bg-rose-500',
  red500: 'bg-red-500',
  orange500: 'bg-orange-500',
  amber500: 'bg-amber-500',
  yellow500: 'bg-yellow-500',
  lime500: 'bg-lime-500',
  green500: 'bg-green-500',
  emerald500: 'bg-emerald-500',
  cyan500: 'bg-cyan-500',
  slate500: 'bg-slate-500',
  gray500: 'bg-gray-500',
  stone500: 'bg-stone-500',
};

const LEGACY_CLASS_TO_TOKEN: Record<string, EmpreendimentoColorToken> = {
  'bg-teal-500': 'teal500',
  'bg-sky-500': 'sky500',
  'bg-blue-500': 'blue500',
  'bg-indigo-500': 'indigo500',
  'bg-violet-500': 'violet500',
  'bg-purple-500': 'purple500',
  'bg-fuchsia-500': 'fuchsia500',
  'bg-pink-500': 'pink500',
  'bg-rose-500': 'rose500',
  'bg-red-500': 'red500',
  'bg-orange-500': 'orange500',
  'bg-amber-500': 'amber500',
  'bg-yellow-500': 'yellow500',
  'bg-lime-500': 'lime500',
  'bg-green-500': 'green500',
  'bg-emerald-500': 'emerald500',
  'bg-cyan-500': 'cyan500',
  'bg-slate-500': 'slate500',
  'bg-gray-500': 'gray500',
  'bg-stone-500': 'stone500',
};

export function normalizeEmpreendimentoColorToken(value: string | null | undefined): EmpreendimentoColorToken {
  if (!value) return DEFAULT_EMPREENDIMENTO_COLOR;
  if (EMPREENDIMENTO_COLOR_OPTIONS.some((c) => c.token === value)) {
    return value as EmpreendimentoColorToken;
  }
  return LEGACY_CLASS_TO_TOKEN[value] ?? DEFAULT_EMPREENDIMENTO_COLOR;
}

export function empreendimentoColorTokenToTailwind(token: EmpreendimentoColorToken): string {
  return TOKEN_TO_TAILWIND[token] ?? TOKEN_TO_TAILWIND[DEFAULT_EMPREENDIMENTO_COLOR];
}

export function normalizeEmpreendimentoTailwindColor(value: string | null | undefined): string {
  if (!value) return TOKEN_TO_TAILWIND[DEFAULT_EMPREENDIMENTO_COLOR];
  const trimmed = value.trim();
  if (!trimmed) return TOKEN_TO_TAILWIND[DEFAULT_EMPREENDIMENTO_COLOR];
  if (trimmed.startsWith('bg-')) return trimmed;
  return empreendimentoColorTokenToTailwind(normalizeEmpreendimentoColorToken(trimmed));
}

export function empreendimentoColorHex(value: string | null | undefined): string {
  const tailwind = normalizeEmpreendimentoTailwindColor(value);
  const token = LEGACY_CLASS_TO_TOKEN[tailwind] ?? DEFAULT_EMPREENDIMENTO_COLOR;
  return EMPREENDIMENTO_COLOR_OPTIONS.find((c) => c.token === token)?.hex ?? '#14b8a6';
}

/** @deprecated use EMPREENDIMENTO_COLOR_OPTIONS */
export const BRAND_COLOR_CLASSES = EMPREENDIMENTO_COLOR_OPTIONS.map((c) => `bg-${c.token.replace('500', '-500')}`);
export const DEFAULT_BRAND_COLOR = DEFAULT_EMPREENDIMENTO_COLOR;
