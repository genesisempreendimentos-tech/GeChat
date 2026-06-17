import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';

const url = getNeonLeadsUrl();
if (!url) {
  console.error('NEON_LEADS_DATABASE_URL não configurada');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();
const { rows } = await client.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'all_leads_unique'
  ORDER BY ordinal_position
`);
console.log(JSON.stringify(rows, null, 2));
await client.end();
