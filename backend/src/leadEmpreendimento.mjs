/** Rotas canônicas por tabela fonte no Neon (espelha LEAD_SOURCE_TABLES). */
const SOURCE_TABLE_PAGES = {
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
  const sourceTable = String(row?.source_table ?? '').trim();
  if (sourceTable && SOURCE_TABLE_PAGES[sourceTable]) {
    return SOURCE_TABLE_PAGES[sourceTable];
  }

  const page = String(row?.page ?? '').trim();
  if (page.startsWith('/')) return page;

  const empreendimento = String(row?.empreendimento ?? '').trim().toLowerCase();
  if (empreendimento && EMPREENDIMENTO_NAME_TO_PAGE[empreendimento]) {
    return EMPREENDIMENTO_NAME_TO_PAGE[empreendimento];
  }

  return page || '/';
}
