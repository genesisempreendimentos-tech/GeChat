import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { enrichHistoricoGeleadsIds } from '../src/lib/geleadsLookup.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const top = await client.query(`
  SELECT id, geleads_id, cvcrm_lead_id, lead_nome, tipo
  FROM historico_movimentacoes
  ORDER BY ocorrido_em DESC, id DESC
  LIMIT 3
`);
console.log('top historico (stored):', top.rows);

const enriched = await enrichHistoricoGeleadsIds(client, top.rows);
console.log('top historico (resolved):', enriched);

await client.end();
