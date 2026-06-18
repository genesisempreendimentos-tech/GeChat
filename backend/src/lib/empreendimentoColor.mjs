/** Tokens de marca → classe Tailwind (espelha frontend/src/lib/brandColors.ts). */

const DEFAULT_TAILWIND = 'bg-teal-500';

const TOKEN_TO_TAILWIND = Object.freeze({
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
});

const LEGACY_CLASS_TO_TOKEN = Object.freeze({
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
});

const TAILWIND_TO_HEX = Object.freeze({
  'bg-teal-500': '#14b8a6',
  'bg-sky-500': '#0ea5e9',
  'bg-blue-500': '#3b82f6',
  'bg-indigo-500': '#6366f1',
  'bg-violet-500': '#8b5cf6',
  'bg-purple-500': '#a855f7',
  'bg-fuchsia-500': '#d946ef',
  'bg-pink-500': '#ec4899',
  'bg-rose-500': '#f43f5e',
  'bg-red-500': '#ef4444',
  'bg-orange-500': '#f97316',
  'bg-amber-500': '#f59e0b',
  'bg-yellow-500': '#eab308',
  'bg-lime-500': '#84cc16',
  'bg-green-500': '#22c55e',
  'bg-emerald-500': '#10b981',
  'bg-cyan-500': '#06b6d4',
  'bg-slate-500': '#64748b',
  'bg-gray-500': '#6b7280',
  'bg-stone-500': '#78716c',
});

/** @param {string | null | undefined} value */
export function normalizeEmpreendimentoColorToken(value) {
  if (!value) return 'teal500';
  const trimmed = String(value).trim();
  if (!trimmed) return 'teal500';
  if (Object.prototype.hasOwnProperty.call(TOKEN_TO_TAILWIND, trimmed)) return trimmed;
  if (Object.prototype.hasOwnProperty.call(LEGACY_CLASS_TO_TOKEN, trimmed)) {
    return LEGACY_CLASS_TO_TOKEN[trimmed];
  }
  return 'teal500';
}

/** @param {string | null | undefined} value */
export function normalizeEmpreendimentoTailwindColor(value) {
  if (!value) return DEFAULT_TAILWIND;
  const trimmed = String(value).trim();
  if (!trimmed) return DEFAULT_TAILWIND;
  if (trimmed.startsWith('bg-')) return trimmed;
  if (Object.prototype.hasOwnProperty.call(TOKEN_TO_TAILWIND, trimmed)) {
    return TOKEN_TO_TAILWIND[trimmed];
  }
  return DEFAULT_TAILWIND;
}

/** @param {string | null | undefined} tailwindClass */
export function empreendimentoTailwindToHex(tailwindClass) {
  const normalized = normalizeEmpreendimentoTailwindColor(tailwindClass);
  return TAILWIND_TO_HEX[normalized] ?? TAILWIND_TO_HEX[DEFAULT_TAILWIND];
}
