/**
 * De-para de canal → bucket → fonte (painel Leads).
 * Sinal primário: coluna `canal` (normalize: lower + trim).
 */

export const CANAL_BUCKETS = [
  'Meta Forms',
  'Site forms',
  'Painel CV',
  'WhatsApp',
  'Outros',
];

/** bucket → fonte. Flipar WhatsApp aqui quando confirmarem. */
export const BUCKET_TO_FONTE = {
  'Meta Forms': 'marketing',
  'Site forms': 'marketing',
  'Painel CV': 'externo',
  WhatsApp: 'externo',
  Outros: 'externo',
};

const BUCKET_PRIORITY = ['Meta Forms', 'Site forms', 'Painel CV', 'WhatsApp', 'Outros'];

export function normalizeCanalRaw(canal) {
  return String(canal ?? '').trim().toLowerCase();
}

/**
 * canal (raw) → bucket do painel.
 * @param {string | null | undefined} canal
 */
export function resolveCanalBucket(canal) {
  const norm = normalizeCanalRaw(canal);
  if (!norm) return 'Outros';
  if (norm === 'meta' || norm === 'facebook') return 'Meta Forms';
  if (norm === 'site' || norm === 'black site') return 'Site forms';
  if (norm === 'painel gestor' || norm === 'painel corretor' || norm === 'painel imobiliária') {
    return 'Painel CV';
  }
  if (norm === 'whatsapp' || norm === 'wa' || norm.includes('whatsapp')) return 'WhatsApp';
  return 'Outros';
}

/** bucket → 'marketing' | 'externo' */
export function resolveFonteFromBucket(bucket) {
  return BUCKET_TO_FONTE[bucket] ?? 'externo';
}

/** Escolhe bucket principal quando a pessoa tem vários canais nos signups. */
export function pickPersonCanalBucket(canalValues) {
  const buckets = new Set(
    (canalValues ?? []).map((c) => resolveCanalBucket(c)).filter(Boolean),
  );
  for (const bucket of BUCKET_PRIORITY) {
    if (buckets.has(bucket)) return bucket;
  }
  return 'Outros';
}

/** SQL: bucket a partir de expressão de canal (ex.: `al.canal`). */
export const SQL_RESOLVE_BUCKET_FROM_CANAL = `CASE
  WHEN NULLIF(LOWER(TRIM(canal_expr)), '') IS NULL THEN 'Outros'
  WHEN LOWER(TRIM(canal_expr)) IN ('meta', 'facebook') THEN 'Meta Forms'
  WHEN LOWER(TRIM(canal_expr)) IN ('site', 'black site') THEN 'Site forms'
  WHEN LOWER(TRIM(canal_expr)) IN ('painel gestor', 'painel corretor', 'painel imobiliária') THEN 'Painel CV'
  WHEN LOWER(TRIM(canal_expr)) IN ('whatsapp', 'wa')
    OR LOWER(TRIM(canal_expr)) LIKE '%whatsapp%' THEN 'WhatsApp'
  ELSE 'Outros'
END`;

export const SQL_RESOLVE_BUCKET_FROM_ALL_LEADS = SQL_RESOLVE_BUCKET_FROM_CANAL.replace(
  /canal_expr/g,
  'al.canal',
);

export const SQL_IS_MARKETING_BUCKET = `(${SQL_RESOLVE_BUCKET_FROM_CANAL.replace(/canal_expr/g, 'al.canal')}) IN ('Meta Forms', 'Site forms')`;

export const SQL_FONTEFROM_BUCKET = `CASE
  WHEN bucket_expr IN ('Meta Forms', 'Site forms') THEN 'marketing'
  ELSE 'externo'
END`;

/** @deprecated use resolveCanalBucket */
export function resolveProvisionalCanal(row) {
  return resolveCanalBucket(row?.canal);
}

export const PROVISIONAL_CANAL_LABELS = CANAL_BUCKETS;
