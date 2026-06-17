/** URL Neon leads — módulo sem side-effects (não importa cvcrmBatchSync). */
export function getNeonLeadsUrl() {
  return process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL || null;
}
