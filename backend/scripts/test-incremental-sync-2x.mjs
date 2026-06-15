import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import { getSyncCursors, runIncrementalSync } from '../src/services/cvcrmIncrementalSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const neonUrl = getNeonLeadsUrl();
const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
await client.connect();

console.log('Cursors antes:', await getSyncCursors());

const run1 = await runIncrementalSync({ skipThrottle: true });
console.log('\nRodada 1:', {
  processed: run1.processed,
  reservas_processed: run1.reservas_processed,
  since_brt_leads: run1.leads?.since_brt,
  since_brt_reservas: run1.reservas?.since_brt,
});

const before2 = await client.query(
  `SELECT COUNT(*)::int AS n, COALESCE(MAX(id), 0)::bigint AS max_id FROM cvcrm_lead_updates`,
);
const maxIdBefore2 = before2.rows[0].max_id;
const totalAuditsBefore2 = before2.rows[0].n;

const run2 = await runIncrementalSync({ skipThrottle: true });
console.log('\nRodada 2:', {
  processed: run2.processed,
  reservas_processed: run2.reservas_processed,
  since_brt_leads: run2.leads?.since_brt,
  since_brt_reservas: run2.reservas?.since_brt,
});

const after2 = await client.query(
  `SELECT COUNT(*)::int AS n FROM cvcrm_lead_updates WHERE id > $1`,
  [maxIdBefore2],
);
const newAuditsRodada2 = after2.rows[0].n;

console.log('\n--- Resultado rodada 2 ---');
console.log('leads processed (rodada 2):', run2.processed);
console.log('reservas processed (rodada 2):', run2.reservas_processed);
console.log('cvcrm_lead_updates NOVAS na rodada 2:', newAuditsRodada2);
console.log('total cvcrm_lead_updates antes/depois:', totalAuditsBefore2, '→', totalAuditsBefore2 + newAuditsRodada2);
console.log('Cursors depois:', run2.cursors ?? (await getSyncCursors()));

await client.end();
process.exit(0);
