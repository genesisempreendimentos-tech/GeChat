/**
 * Backfill: leads_cvcrm.created_at ← payload.data_cad (data real do lead no CVCRM).
 * Depois re-sincroniza all_leads + all_leads_unique.
 *
 * Uso: node backend/scripts/backfill-leads-cvcrm-created-at.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { toCvcrmTimestamptzParam } from '../src/services/cvcrmBatchSync.mjs';
import { syncLeadsFromSources } from '../src/services/leadSourceSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function backfillLeadsCvcrmCreatedAt(client) {
  const { rows } = await client.query(
    `SELECT id, cvcrm_lead_id, created_at, cvcrm_payload
     FROM leads_cvcrm
     WHERE NULLIF(TRIM(cvcrm_payload->>'data_cad'), '') IS NOT NULL`,
  );

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const payload =
      row.cvcrm_payload && typeof row.cvcrm_payload === 'object' ? row.cvcrm_payload : {};
    const createdAt = toCvcrmTimestamptzParam(payload.data_cad ?? payload.data_cadastro);
    if (!createdAt) {
      skipped += 1;
      continue;
    }

    const next = new Date(createdAt);
    const prev = row.created_at ? new Date(row.created_at) : null;
    if (prev && Math.abs(prev.getTime() - next.getTime()) < 1000) {
      skipped += 1;
      continue;
    }

    await client.query(`UPDATE leads_cvcrm SET created_at = $2::timestamptz WHERE id = $1`, [
      row.id,
      createdAt,
    ]);
    updated += 1;
  }

  return { scanned: rows.length, updated, skipped };
}

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const before = await client.query(`
      SELECT COUNT(*)::int AS n
      FROM leads_cvcrm
      WHERE created_at >= '2026-06-01'
    `);
    console.log('[backfill] leads_cvcrm com created_at em jun/2026 (antes):', before.rows[0]?.n);

    const result = await backfillLeadsCvcrmCreatedAt(client);
    console.log('[backfill] leads_cvcrm.created_at:', result);

    const after = await client.query(`
      SELECT COUNT(*)::int AS n
      FROM leads_cvcrm
      WHERE created_at >= '2026-06-01'
    `);
    console.log('[backfill] leads_cvcrm com created_at em jun/2026 (depois):', after.rows[0]?.n);
  } finally {
    await client.end().catch(() => {});
  }

  console.log('[backfill] Re-sincronizando all_leads + all_leads_unique…');
  const sync = await syncLeadsFromSources({ force: true });
  console.log('[backfill] sync concluído:', sync);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
