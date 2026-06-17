import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE created_at >= '2026-06-01')::int AS created_jun2026,
      COUNT(*) FILTER (WHERE NULLIF(TRIM(cvcrm_payload->>'data_cad'), '') IS NOT NULL)::int AS has_data_cad,
      COUNT(*) FILTER (
        WHERE created_at >= '2026-06-01'
          AND NULLIF(TRIM(cvcrm_payload->>'data_cad'), '') IS NOT NULL
          AND created_at::date > (substring(cvcrm_payload->>'data_cad' from 1 for 10))::date + interval '7 days'
      )::int AS suspect_ingestion
    FROM leads_cvcrm
  `);
  console.log('leads_cvcrm stats', stats);

  const { rows: sample } = await client.query(`
    SELECT cvcrm_lead_id, created_at, cvcrm_payload->>'data_cad' AS data_cad
    FROM leads_cvcrm
    WHERE created_at >= '2026-06-01'
    ORDER BY created_at DESC
    LIMIT 5
  `);
  console.log('sample jun2026', sample);
} finally {
  await client.end().catch(() => {});
}
