/** Rotas canônicas por tabela fonte no Neon (espelha LEAD_SOURCE_TABLES). */
const SOURCE_TABLE_PAGES = {
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
const LEGACY_SOURCE_TABLE_ALIASES = {
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

function normalizeSourceTable(sourceTable) {
  const raw = String(sourceTable ?? '').trim();
  if (!raw) return '';
  return LEGACY_SOURCE_TABLE_ALIASES[raw] ?? raw;
}

const EMPREENDIMENTO_NAME_TO_PAGE = {
  'solar do bosque': '/solar-do-bosque',
  'oásis residencial ii': '/oasis-ii',
  'oasis residencial ii': '/oasis-ii',
  'kastell residencial': '/kastell',
  kastell: '/kastell',
  'nature residencial': '/nature',
  nature: '/nature',
  'oásis residencial': '/oasis',
  'oasis residencial': '/oasis',
  'solar bellavista': '/solar-bellavista',
  'solar das flores': '/solar-das-flores',
  'vita residencial': '/vita',
  vita: '/vita',
  'flow residencial': '/flow',
  flow: '/flow',
};

export function resolveEmpreendimentoPage(row) {
  const sourceTable = normalizeSourceTable(row?.source_table);
  if (sourceTable && SOURCE_TABLE_PAGES[sourceTable]) {
    return SOURCE_TABLE_PAGES[sourceTable];
  }

  const page = String(row?.page ?? '').trim();
  if (page.startsWith('/')) return page;

  const empreendimento = String(row?.empreendimento_interesse ?? '').trim().toLowerCase();
  if (empreendimento && EMPREENDIMENTO_NAME_TO_PAGE[empreendimento]) {
    return EMPREENDIMENTO_NAME_TO_PAGE[empreendimento];
  }

  return page || '/';
}
