/**
 * Reset único do registry geleads_id + rebuild na faixa A (A0001 = created_at mais antigo).
 * Pré-requisito: código corrigido (reuso + fallback + merge menor seq) já deployado.
 *
 * Uso: node backend/scripts/reset-geleads-id.mjs
 */
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

console.log('[geleads_id] TRUNCATE registry + keys, RESTART seq=1...');
await client.query('TRUNCATE geleads_id_keys');
await client.query('TRUNCATE geleads_id_registry CASCADE');
await client.query(`ALTER SEQUENCE geleads_id_seq RESTART WITH 1`);

console.log('[geleads_id] rebuild all_leads_unique (created_at ASC)...');
const t0 = Date.now();
const result = await rebuildAllLeadsUnique(client);
console.log(`[geleads_id] rebuild em ${((Date.now() - t0) / 1000).toFixed(1)}s`, result);

await client.end();
