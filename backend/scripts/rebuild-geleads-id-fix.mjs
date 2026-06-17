import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const before = await client.query(`
  SELECT geleads_id FROM all_leads_unique
  WHERE created_at = '2021-03-01T14:40:43.000Z' LIMIT 1
`);
const regBefore = await client.query(`
  SELECT geleads_id FROM geleads_id_registry WHERE seq = 1 AND status = 'active'
`);
console.log('Antes rebuild — unique oldest geleads_id:', before.rows[0]?.geleads_id);
console.log('Registry seq=1:', regBefore.rows[0]?.geleads_id);

const t0 = Date.now();
await rebuildAllLeadsUnique(client);
console.log(`Rebuild em ${((Date.now() - t0) / 1000).toFixed(2)}s`);

const stats = await client.query(`
  SELECT COUNT(*)::int AS pessoas, COUNT(geleads_id) AS com_id,
         COUNT(*) - COUNT(geleads_id) AS sem_id,
         COUNT(DISTINCT geleads_id) AS ids_distintos
  FROM all_leads_unique
`);
console.log('stats', stats.rows[0]);

const oldest = await client.query(`
  SELECT geleads_id, created_at FROM all_leads_unique
  ORDER BY created_at ASC, geleads_id ASC LIMIT 1
`);
console.log('oldest', oldest.rows[0]);
console.log('A0001 preservado:', oldest.rows[0]?.geleads_id === 'A0001' ? 'SIM' : 'NAO');

await client.end();
