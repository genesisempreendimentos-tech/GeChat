/** 12 tabelas de marketing (site_* + campanha_*). Exclui leads_antigos e leads_cvcrm. */
export const LEADS_MARKETING_TABLES = [
  'campanha_niver_208_anos_friburgo',
  'campanha_blackgenesis',
  'site_flow',
  'site_gesite',
  'site_kastell',
  'site_nature',
  'site_oasis_i',
  'site_oasis_ii',
  'site_solar_bellavista',
  'site_solar_bosque',
  'site_solar_flores',
  'site_vita',
];

export const LEADS_MARKETING_TABLES_SET = new Set(LEADS_MARKETING_TABLES);

/** SQL: true se source_table (texto único) é marketing. */
export const SQL_IS_MARKETING_SOURCE = `source_table = ANY(ARRAY[${LEADS_MARKETING_TABLES.map((t) => `'${t}'`).join(',')}])`;

/** SQL: true se array source_table contém alguma tabela de marketing. */
export const SQL_HAS_MARKETING_SOURCE = `EXISTS (
  SELECT 1 FROM unnest(source_table) AS st
  WHERE st = ANY(ARRAY[${LEADS_MARKETING_TABLES.map((t) => `'${t}'`).join(',')}])
)`;
