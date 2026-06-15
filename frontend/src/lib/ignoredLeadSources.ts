/** Tabelas Neon excluídas da sync e dos relatórios do GêLeads. */
export const IGNORED_NEON_LEAD_SOURCE_TABLES = [
  'campanha_niver_208_anos_friburgo',
  'site_gesite',
  'campanha_blackgenesis',
  'leads_antigos',
] as const;

/** Rotas (`pagina`) das fontes ignoradas — cobre dados já sincronizados. */
export const IGNORED_LEAD_PAGES = [
  '/aniversario-208',
  '/gesite',
  '/black-genesis',
  '/legado',
] as const;

function normalizePagePath(page: string): string {
  const trimmed = page.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

const LEGACY_SOURCE_TABLE_ALIASES: Record<string, string> = {
  leads_aniversario_208_anos: 'campanha_niver_208_anos_friburgo',
  leads_gesite: 'site_gesite',
  leads_blackgenesis: 'campanha_blackgenesis',
  leads_old: 'leads_antigos',
};

function normalizeSourceTable(sourceTable: string): string {
  const raw = sourceTable.trim().toLowerCase();
  if (!raw) return '';
  return LEGACY_SOURCE_TABLE_ALIASES[raw] ?? raw;
}

export function isIgnoredLeadSource(sourceTable?: string | null, page?: string | null): boolean {
  const table = normalizeSourceTable(sourceTable ?? '');
  if (table && (IGNORED_NEON_LEAD_SOURCE_TABLES as readonly string[]).includes(table)) {
    return true;
  }

  const normalizedPage = normalizePagePath(page ?? '');
  if (!normalizedPage) return false;

  return IGNORED_LEAD_PAGES.some(
    (ignored) => normalizedPage === ignored || normalizedPage.startsWith(`${ignored}/`),
  );
}

export function isIgnoredLeadRow(row: { _table?: string; pagina?: string }): boolean {
  return isIgnoredLeadSource(row._table, row.pagina);
}
