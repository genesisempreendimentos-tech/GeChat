/** Cores de marca para empreendimentos (token salvo no Neon + hex para UI). */
export const EMPREENDIMENTO_COLOR_OPTIONS = [
  // Azuis e ciano
  { token: 'cyan400', hex: '#22d3ee' },
  { token: 'cyan500', hex: '#06b6d4' },
  { token: 'sky400', hex: '#38bdf8' },
  { token: 'sky500', hex: '#0ea5e9' },
  { token: 'blue400', hex: '#60a5fa' },
  { token: 'blue500', hex: '#3b82f6' },
  { token: 'blue600', hex: '#2563eb' },
  { token: 'indigo500', hex: '#6366f1' },
  // Roxos e rosas
  { token: 'violet500', hex: '#8b5cf6' },
  { token: 'purple500', hex: '#a855f7' },
  { token: 'fuchsia500', hex: '#d946ef' },
  { token: 'pink500', hex: '#ec4899' },
  { token: 'rose500', hex: '#f43f5e' },
  // Quentes
  { token: 'red500', hex: '#ef4444' },
  { token: 'orange500', hex: '#f97316' },
  { token: 'amber400', hex: '#fbbf24' },
  { token: 'amber500', hex: '#f59e0b' },
  { token: 'yellow400', hex: '#facc15' },
  { token: 'yellow500', hex: '#eab308' },
  // Verdes
  { token: 'lime500', hex: '#84cc16' },
  { token: 'green500', hex: '#22c55e' },
  { token: 'green600', hex: '#16a34a' },
  { token: 'emerald500', hex: '#10b981' },
  { token: 'emerald600', hex: '#059669' },
  { token: 'teal400', hex: '#2dd4bf' },
  { token: 'teal500', hex: '#14b8a6' },
  { token: 'teal600', hex: '#0d9488' },
  // Neutros
  { token: 'slate500', hex: '#64748b' },
  { token: 'gray500', hex: '#6b7280' },
  { token: 'stone500', hex: '#78716c' },
] as const;

export type EmpreendimentoColorToken = (typeof EMPREENDIMENTO_COLOR_OPTIONS)[number]['token'];

/** Ordem espectral no seletor de cor. */
export const EMPREENDIMENTO_COLOR_GROUPS: {
  label: string;
  tokens: EmpreendimentoColorToken[];
}[] = [
  {
    label: 'Azuis e ciano',
    tokens: ['cyan400', 'cyan500', 'sky400', 'sky500', 'blue400', 'blue500', 'blue600', 'indigo500'],
  },
  {
    label: 'Roxos e rosas',
    tokens: ['violet500', 'purple500', 'fuchsia500', 'pink500', 'rose500'],
  },
  {
    label: 'Quentes e amarelos',
    tokens: ['red500', 'orange500', 'amber400', 'amber500', 'yellow400', 'yellow500'],
  },
  {
    label: 'Verdes',
    tokens: [
      'lime500',
      'green500',
      'green600',
      'emerald500',
      'emerald600',
      'teal400',
      'teal500',
      'teal600',
    ],
  },
  {
    label: 'Neutros',
    tokens: ['slate500', 'gray500', 'stone500'],
  },
];

export const EMPREENDIMENTO_COLOR_COUNT = EMPREENDIMENTO_COLOR_OPTIONS.length;

export const DEFAULT_EMPREENDIMENTO_COLOR: EmpreendimentoColorToken = 'teal500';

const COLOR_BY_TOKEN = new Map(
  EMPREENDIMENTO_COLOR_OPTIONS.map((c) => [c.token, c] as const),
);

function tokenToTailwindClass(token: string): string {
  const match = String(token).match(/^([a-z]+)(\d+)$/);
  if (!match) return 'bg-teal-500';
  return `bg-${match[1]}-${match[2]}`;
}

const TOKEN_TO_TAILWIND = Object.fromEntries(
  EMPREENDIMENTO_COLOR_OPTIONS.map((c) => [c.token, tokenToTailwindClass(c.token)]),
) as Record<EmpreendimentoColorToken, string>;

const LEGACY_CLASS_TO_TOKEN = Object.fromEntries(
  EMPREENDIMENTO_COLOR_OPTIONS.map((c) => [tokenToTailwindClass(c.token), c.token]),
) as Record<string, EmpreendimentoColorToken>;

export function normalizeEmpreendimentoColorToken(value: string | null | undefined): EmpreendimentoColorToken {
  if (!value) return DEFAULT_EMPREENDIMENTO_COLOR;
  const trimmed = value.trim();
  if (COLOR_BY_TOKEN.has(trimmed as EmpreendimentoColorToken)) {
    return trimmed as EmpreendimentoColorToken;
  }
  if (LEGACY_CLASS_TO_TOKEN[trimmed]) {
    return LEGACY_CLASS_TO_TOKEN[trimmed];
  }
  return DEFAULT_EMPREENDIMENTO_COLOR;
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
  const token = normalizeEmpreendimentoColorToken(value);
  return COLOR_BY_TOKEN.get(token)?.hex ?? '#14b8a6';
}

export function getEmpreendimentoColorOption(token: EmpreendimentoColorToken) {
  return COLOR_BY_TOKEN.get(token);
}

/** token → nome do empreendimento que já usa a cor (exclui `excludeId` ao editar). */
export function buildUsedEmpreendimentoColorMap(
  items: { id: number; nome: string; cor: string | null }[],
  excludeId?: number | null,
): Map<EmpreendimentoColorToken, string> {
  const map = new Map<EmpreendimentoColorToken, string>();
  for (const item of items) {
    if (excludeId != null && item.id === excludeId) continue;
    const token = normalizeEmpreendimentoColorToken(item.cor);
    if (!map.has(token)) map.set(token, item.nome);
  }
  return map;
}

/** @deprecated use EMPREENDIMENTO_COLOR_OPTIONS */
export const BRAND_COLOR_CLASSES = EMPREENDIMENTO_COLOR_OPTIONS.map((c) => tokenToTailwindClass(c.token));
export const DEFAULT_BRAND_COLOR = DEFAULT_EMPREENDIMENTO_COLOR;
