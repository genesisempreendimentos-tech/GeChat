/** Rotas canônicas por tabela fonte no Neon (espelha LEAD_SOURCE_TABLES do backend). */
const SOURCE_TABLE_PAGES: Record<string, string> = {
  site_solar_bosque: '/solar-do-bosque',
  site_oasis_ii: '/oasis-ii',
  site_kastell: '/kastell',
  site_nature: '/nature',
  site_oasis_i: '/oasis',
  site_solar_bellavista: '/solar-bellavista',
  site_solar_flores: '/solar-das-flores',
  site_vita: '/vita',
  site_flow: '/flow',
  campanha_niver_208_anos_friburgo: '/aniversario-208',
};

/** source_table legado em all_leads → nome atual no Neon */
const LEGACY_SOURCE_TABLE_ALIASES: Record<string, string> = {
  leads_solar_bosque: 'site_solar_bosque',
  leads_solar_do_bosque: 'site_solar_bosque',
  leads_oasis_ii: 'site_oasis_ii',
  leads_kastell: 'site_kastell',
  leads_nature: 'site_nature',
  leads_oasis_i: 'site_oasis_i',
  leads_oasis: 'site_oasis_i',
  leads_solar_bellavista: 'site_solar_bellavista',
  leads_bellavista: 'site_solar_bellavista',
  leads_solar_flores: 'site_solar_flores',
  leads_flores: 'site_solar_flores',
  leads_vita: 'site_vita',
  leads_flow: 'site_flow',
  leads_gesite: 'site_gesite',
  leads_blackgenesis: 'campanha_blackgenesis',
  leads_aniversario_208_anos: 'campanha_niver_208_anos_friburgo',
  leads_old: 'leads_antigos',
};

function normalizeSourceTable(sourceTable: string): string {
  const raw = sourceTable.trim();
  if (!raw) return '';
  return LEGACY_SOURCE_TABLE_ALIASES[raw] ?? raw;
}

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
  empreendimento_interesse?: string;
  _table?: string;
  source_table?: string;
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
  const sourceTable = normalizeSourceTable(row._table ?? '');
  if (sourceTable && SOURCE_TABLE_PAGES[sourceTable]) {
    return SOURCE_TABLE_PAGES[sourceTable];
  }

  const pagina = (row.pagina ?? '').trim();
  if (pagina.startsWith('/')) return pagina;

  const empreendimento = (row.empreendimento_interesse ?? row.empreendimento ?? '').trim();
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
  const empreendimento = (row.empreendimento_interesse ?? row.empreendimento ?? '').trim();
  if (empreendimento) return empreendimento;
  return formatPaginaSlugLabel(resolveEmpreendimentoPagina(row));
}
