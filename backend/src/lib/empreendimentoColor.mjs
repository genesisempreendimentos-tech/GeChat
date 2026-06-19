/** Tokens de marca → classe Tailwind (espelha frontend/src/lib/brandColors.ts). */

const DEFAULT_TOKEN = 'teal500';
const DEFAULT_TAILWIND = 'bg-teal-500';

const COLOR_DEFS = [
  { token: 'cyan400', hex: '#22d3ee' },
  { token: 'cyan500', hex: '#06b6d4' },
  { token: 'sky400', hex: '#38bdf8' },
  { token: 'sky500', hex: '#0ea5e9' },
  { token: 'blue400', hex: '#60a5fa' },
  { token: 'blue500', hex: '#3b82f6' },
  { token: 'blue600', hex: '#2563eb' },
  { token: 'indigo500', hex: '#6366f1' },
  { token: 'violet500', hex: '#8b5cf6' },
  { token: 'purple500', hex: '#a855f7' },
  { token: 'fuchsia500', hex: '#d946ef' },
  { token: 'pink500', hex: '#ec4899' },
  { token: 'rose500', hex: '#f43f5e' },
  { token: 'red500', hex: '#ef4444' },
  { token: 'orange500', hex: '#f97316' },
  { token: 'amber400', hex: '#fbbf24' },
  { token: 'amber500', hex: '#f59e0b' },
  { token: 'yellow400', hex: '#facc15' },
  { token: 'yellow500', hex: '#eab308' },
  { token: 'lime500', hex: '#84cc16' },
  { token: 'green500', hex: '#22c55e' },
  { token: 'green600', hex: '#16a34a' },
  { token: 'emerald500', hex: '#10b981' },
  { token: 'emerald600', hex: '#059669' },
  { token: 'teal400', hex: '#2dd4bf' },
  { token: 'teal500', hex: '#14b8a6' },
  { token: 'teal600', hex: '#0d9488' },
  { token: 'slate500', hex: '#64748b' },
  { token: 'gray500', hex: '#6b7280' },
  { token: 'stone500', hex: '#78716c' },
];

function tokenToTailwindClass(token) {
  const match = String(token).match(/^([a-z]+)(\d+)$/);
  if (!match) return DEFAULT_TAILWIND;
  return `bg-${match[1]}-${match[2]}`;
}

const TOKEN_TO_TAILWIND = Object.freeze(
  Object.fromEntries(COLOR_DEFS.map((c) => [c.token, tokenToTailwindClass(c.token)])),
);

const LEGACY_CLASS_TO_TOKEN = Object.freeze(
  Object.fromEntries(COLOR_DEFS.map((c) => [tokenToTailwindClass(c.token), c.token])),
);

const TAILWIND_TO_HEX = Object.freeze(
  Object.fromEntries(COLOR_DEFS.map((c) => [tokenToTailwindClass(c.token), c.hex])),
);

/** @param {string | null | undefined} value */
export function normalizeEmpreendimentoColorToken(value) {
  if (!value) return DEFAULT_TOKEN;
  const trimmed = String(value).trim();
  if (!trimmed) return DEFAULT_TOKEN;
  if (Object.prototype.hasOwnProperty.call(TOKEN_TO_TAILWIND, trimmed)) return trimmed;
  if (Object.prototype.hasOwnProperty.call(LEGACY_CLASS_TO_TOKEN, trimmed)) {
    return LEGACY_CLASS_TO_TOKEN[trimmed];
  }
  return DEFAULT_TOKEN;
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
