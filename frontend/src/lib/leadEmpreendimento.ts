/** Rotas canônicas por tabela fonte no Neon (espelha LEAD_SOURCE_TABLES do backend). */
const SOURCE_TABLE_PAGES: Record<string, string> = {
  leads_solar_bosque: '/solar-do-bosque',
  leads_solar_do_bosque: '/solar-do-bosque',
  leads_oasis_ii: '/oasis-ii',
  leads_kastell: '/kastell',
  leads_nature: '/nature',
  leads_oasis_i: '/oasis',
  leads_oasis: '/oasis',
  leads_solar_bellavista: '/solar-bellavista',
  leads_bellavista: '/solar-bellavista',
  leads_solar_flores: '/solar-das-flores',
  leads_flores: '/solar-das-flores',
  leads_vita: '/vita',
  leads_flow: '/flow',
};

const EMPREENDIMENTO_NAME_TO_PAGE: Record<string, string> = {
  'solar do bosque': '/solar-do-bosque',
  'oásis residencial ii': '/oasis-ii',
  'oasis residencial ii': '/oasis-ii',
  'kastell residencial': '/kastell',
  'kastell': '/kastell',
  'nature residencial': '/nature',
  'nature': '/nature',
  'oásis residencial': '/oasis',
  'oasis residencial': '/oasis',
  'solar bellavista': '/solar-bellavista',
  'solar das flores': '/solar-das-flores',
  'vita residencial': '/vita',
  'vita': '/vita',
  'flow residencial': '/flow',
  'flow': '/flow',
};

export type LeadEmpreendimentoFields = {
  pagina?: string;
  empreendimento?: string;
  _table?: string;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function pageFromEmpreendimentoName(name: string): string | null {
  const key = normalizeKey(name);
  return EMPREENDIMENTO_NAME_TO_PAGE[key] ?? null;
}

/** Rota do empreendimento — nunca usa interesse livre do formulário. */
export function resolveEmpreendimentoPagina(row: LeadEmpreendimentoFields): string {
  const sourceTable = (row._table ?? '').trim();
  if (sourceTable && SOURCE_TABLE_PAGES[sourceTable]) {
    return SOURCE_TABLE_PAGES[sourceTable];
  }

  const pagina = (row.pagina ?? '').trim();
  if (pagina.startsWith('/')) return pagina;

  const empreendimento = (row.empreendimento ?? '').trim();
  if (empreendimento) {
    const fromName = pageFromEmpreendimentoName(empreendimento);
    if (fromName) return fromName;
  }

  return pagina || '/';
}

export function formatPaginaSlugLabel(path: string): string {
  const slug = path.replace(/^\//, '') || 'home';
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Nome exibido no ranking/filtros — prioriza empreendimento cadastrado. */
export function resolveEmpreendimentoLabel(row: LeadEmpreendimentoFields): string {
  const empreendimento = (row.empreendimento ?? '').trim();
  if (empreendimento) return empreendimento;
  return formatPaginaSlugLabel(resolveEmpreendimentoPagina(row));
}
