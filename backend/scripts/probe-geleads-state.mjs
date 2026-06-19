import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const reg = await client.query(`
  SELECT
    COUNT(*) FILTER (WHERE status = 'active')::int AS active,
    COUNT(*) FILTER (WHERE status = 'merged')::int AS merged,
    MAX(seq)::bigint AS seq_max
  FROM geleads_id_registry
`);
const u = await client.query(`
  SELECT LEFT(geleads_id, 1) AS p, COUNT(*)::int AS n
  FROM all_leads_unique GROUP BY 1 ORDER BY 1
`);
const oldest = await client.query(`
  SELECT geleads_id, created_at FROM all_leads_unique ORDER BY created_at ASC LIMIT 1
`);
const fallbackKeys = await client.query(`
  SELECT COUNT(*)::int AS n FROM geleads_id_keys WHERE key_type = 'fallback'
`);

console.log(JSON.stringify({
  registry: reg.rows[0],
  prefixes: u.rows,
  oldest: oldest.rows[0],
  fallback_keys: fallbackKeys.rows[0].n,
}, null, 2));

await client.end();
