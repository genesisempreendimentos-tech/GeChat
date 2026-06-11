const LOGOS_BASE = '/assets/Logos';

const EMPREENDIMENTO_ICON_BY_PAGE: Record<string, string> = {
  '/solar-das-flores': `${LOGOS_BASE}/Icon-Flores-Text-White.png`,
  '/vita': `${LOGOS_BASE}/Vita-logo-horizontal.png`,
  '/oasis': `${LOGOS_BASE}/branco-fundo-transparente-oasis.png`,
  '/oasis-ii': `${LOGOS_BASE}/Logo-Laranja-e-branco-oasis-ii.png`,
  '/flow': `${LOGOS_BASE}/Flow-Logo.png`,
  '/nature': `${LOGOS_BASE}/logo-texto-nature.svg`,
  '/solar-bellavista': `${LOGOS_BASE}/LOGO-SOLAR-BELLAVISTA.png`,
  '/solar-do-bosque': `${LOGOS_BASE}/solar-do-bosque-sbg-white.png`,
};

/** Logos claros que precisam de fundo escuro para contraste no tema claro. */
const DARK_BACKDROP_PAGES = new Set([
  '/solar-das-flores',
  '/oasis',
  '/solar-do-bosque',
  '/solar-bellavista',
]);

const NAME_TO_PAGE: Record<string, string> = {
  'solar das flores': '/solar-das-flores',
  'solar flores': '/solar-das-flores',
  'vita': '/vita',
  'vita residencial': '/vita',
  'oasis': '/oasis',
  'oásis': '/oasis',
  'oasis residencial': '/oasis',
  'oásis residencial': '/oasis',
  'oasis ii': '/oasis-ii',
  'oásis ii': '/oasis-ii',
  'oasis residencial ii': '/oasis-ii',
  'oásis residencial ii': '/oasis-ii',
  'flow': '/flow',
  'flow residencial': '/flow',
  'nature': '/nature',
  'nature residencial': '/nature',
  'solar bellavista': '/solar-bellavista',
  'bellavista': '/solar-bellavista',
  'bela vista': '/solar-bellavista',
  'solar do bosque': '/solar-do-bosque',
  'bosque': '/solar-do-bosque',
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveEmpreendimentoIconPage(paginaOrName: string): string | null {
  const trimmed = paginaOrName.trim();
  if (!trimmed || trimmed === '—') return null;

  if (trimmed.startsWith('/')) {
    return EMPREENDIMENTO_ICON_BY_PAGE[trimmed] ? trimmed : null;
  }

  return NAME_TO_PAGE[normalizeKey(trimmed)] ?? null;
}

export function getEmpreendimentoIconUrl(paginaOrName: string): string | null {
  const page = resolveEmpreendimentoIconPage(paginaOrName);
  if (!page) return null;
  return EMPREENDIMENTO_ICON_BY_PAGE[page] ?? null;
}

export function empreendimentoIconNeedsDarkBackdrop(paginaOrName: string): boolean {
  const page = resolveEmpreendimentoIconPage(paginaOrName);
  return page ? DARK_BACKDROP_PAGES.has(page) : false;
}
