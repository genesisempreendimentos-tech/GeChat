/**
 * Mapeamento site_* → label canônico Genesis para sinal de interesse (b).
 * site_gesite e campanha_* são genéricos — não mapeiam.
 */
import { classifyAliasStatus, normalizeEmpreendimento } from './normalizeEmpreendimento.mjs';

/** @type {Record<string, string>} */
export const SITE_TABLE_TO_EMPREENDIMENTO = {
  site_flow: 'Flow',
  site_kastell: 'Kastell Residencial',
  site_nature: 'Nature Residencial',
  site_oasis_i: 'Oásis Residencial',
  site_oasis_ii: 'Oásis Residencial II',
  site_solar_bellavista: 'Solar Bellavista',
  site_solar_bosque: 'Solar do Bosque',
  site_solar_flores: 'Solar das Flores',
  site_vita: 'Vita Residencial',
};

export function isSiteTableWithEmpreendimento(sourceTable) {
  return Object.prototype.hasOwnProperty.call(SITE_TABLE_TO_EMPREENDIMENTO, sourceTable);
}

/** Retorna empreendimento_norm estável ou null se a tabela não mapeia. */
export function interesseNormFromSiteTable(sourceTable) {
  const label = SITE_TABLE_TO_EMPREENDIMENTO[sourceTable];
  if (!label) return null;
  const norm = normalizeEmpreendimento(label);
  return classifyAliasStatus(norm) !== 'nao_informado' ? norm : null;
}
