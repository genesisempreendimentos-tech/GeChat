import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import { getSyncCursors, runIncrementalSync } from '../src/services/cvcrmIncrementalSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

console.log('=== TESTE sync incremental ===\n');

const cursorsBefore = await getSyncCursors();
console.log('Cursors antes:', cursorsBefore);

const run1 = await runIncrementalSync({ skipThrottle: true });
console.log('\nRodada 1:', JSON.stringify({
  processed: run1.processed,
  reservas_processed: run1.reservas_processed,
  errors: run1.errors,
  since_brt_leads: run1.leads?.since_brt,
  cursors: run1.cursors,
}, null, 2));

const neonUrl = getNeonLeadsUrl();
if (neonUrl) {
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();
  const audits = await client.query(
    `SELECT COUNT(*)::int AS n FROM cvcrm_lead_updates WHERE synced_at > now() - interval '10 minutes'`,
  );
  console.log('\ncvcrm_lead_updates (últimos 10 min):', audits.rows[0]?.n);
  await client.end();
}

console.log('\n--- Rodada 2 imediata (deve barrar trava 60s) ---');
const run2 = await runIncrementalSync();
console.log('Rodada 2:', JSON.stringify({
  skipped: run2.skipped,
  message: run2.message,
  processed: run2.processed,
  cursors: run2.cursors ?? await getSyncCursors(),
}, null, 2));

process.exit(0);
