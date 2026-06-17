import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

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

const sample = await client.query(`
  SELECT person_id, geleads_id FROM all_leads_unique LIMIT 3
`);
console.log('sample', sample.rows);

await client.end();
