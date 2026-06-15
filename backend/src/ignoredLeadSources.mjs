/** Tabelas Neon excluídas da sync e da listagem do GêLeads. */
export const IGNORED_NEON_LEAD_SOURCE_TABLES = [
  'campanha_niver_208_anos_friburgo',
  'site_gesite',
  'campanha_blackgenesis',
  'leads_antigos',
];

/** Rotas (`page`) associadas às fontes ignoradas — cobre dados já sincronizados. */
export const IGNORED_LEAD_PAGES = [
  '/aniversario-208',
  '/gesite',
  '/black-genesis',
  '/legado',
];

function normalizePagePath(page) {
  const trimmed = String(page ?? '').trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** source_table legado → nome atual (subset usado na exclusão de sync/UI) */
const LEGACY_SOURCE_TABLE_ALIASES = {
  leads_aniversario_208_anos: 'campanha_niver_208_anos_friburgo',
  leads_gesite: 'site_gesite',
  leads_blackgenesis: 'campanha_blackgenesis',
  leads_old: 'leads_antigos',
};

function normalizeSourceTable(sourceTable) {
  const raw = String(sourceTable ?? '').trim().toLowerCase();
  if (!raw) return '';
  return LEGACY_SOURCE_TABLE_ALIASES[raw] ?? raw;
}

export function isIgnoredLeadSource(sourceTable, page) {
  const table = normalizeSourceTable(sourceTable);
  if (table && IGNORED_NEON_LEAD_SOURCE_TABLES.includes(table)) return true;

  const normalizedPage = normalizePagePath(page);
  if (!normalizedPage) return false;

  return IGNORED_LEAD_PAGES.some(
    (ignored) => normalizedPage === ignored || normalizedPage.startsWith(`${ignored}/`),
  );
}
