/** Tabelas Neon excluídas da sync e da listagem do GêLeads. */
export const IGNORED_NEON_LEAD_SOURCE_TABLES = [
  'leads_aniversario_208_anos',
  'leads_gesite',
  'leads_blackgenesis',
  'leads_old',
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

export function isIgnoredLeadSource(sourceTable, page) {
  const table = String(sourceTable ?? '').trim().toLowerCase();
  if (table && IGNORED_NEON_LEAD_SOURCE_TABLES.includes(table)) return true;

  const normalizedPage = normalizePagePath(page);
  if (!normalizedPage) return false;

  return IGNORED_LEAD_PAGES.some(
    (ignored) => normalizedPage === ignored || normalizedPage.startsWith(`${ignored}/`),
  );
}
