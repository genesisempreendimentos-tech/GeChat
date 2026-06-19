/**
 * Simula sync de prod (syncLeadsFromSources force) e verifica seq_max estável.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { syncLeadsFromSources } from '../src/services/leadSourceSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function seqMax() {
  const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
  await client.connect();
  const { rows: [r] } = await client.query(`
    SELECT MAX(seq)::bigint AS seq_max,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active
    FROM geleads_id_registry
  `);
  await client.end();
  return r;
}

const before = await seqMax();
console.log('[sync-test] seq_max antes:', before);

const result = await syncLeadsFromSources({ force: true });
console.log('[sync-test] syncLeadsFromSources:', {
  synced: result.synced,
  changed: result.changed,
  uniqueSkipped: result.uniqueSkipped,
  rebuildPending: result.rebuildPending,
  unique: result.unique,
});

const after = await seqMax();
console.log('[sync-test] seq_max depois:', after);

if (Number(after.seq_max) !== Number(before.seq_max)) {
  console.error(`FALHA: seq_max cresceu ${before.seq_max} → ${after.seq_max}`);
  process.exit(1);
}
console.log('✓ seq_max estável após sync');
