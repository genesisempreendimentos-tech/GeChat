import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  applyCvcrmLeadRouted,
  getCvcrmCredentials,
  getNeonLeadsUrl,
} from '../src/services/cvcrmBatchSync.mjs';
import { brtTimestamp } from '../src/services/cvcrmIncrementalSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const { email, token } = getCvcrmCredentials();
const sinceBrt = brtTimestamp(new Date(Date.now() - 20 * 60 * 1000));
const url = `https://genesis.cvcrm.com.br/api/v1/cvdw/leads?a_partir_data_referencia=${encodeURIComponent(sinceBrt)}&registros_por_pagina=10&pagina=1`;
const page = await fetch(url, { headers: { accept: 'application/json', email, token } }).then((r) => r.json());

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const before = await client.query(`SELECT COALESCE(MAX(id),0)::bigint AS max_id FROM cvcrm_lead_updates`);

for (const lead of page.dados ?? []) {
  const idlead = String(lead.idlead);
  console.log('\n=== idlead', idlead, '===');
  await applyCvcrmLeadRouted(client, idlead, lead);
  const mid = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_lead_updates WHERE id > $1`, [before.rows[0].max_id]);
  console.log('audits após 1ª apply:', mid.rows[0].n);
  await applyCvcrmLeadRouted(client, idlead, lead);
  const after = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_lead_updates WHERE id > $1`, [before.rows[0].max_id]);
  console.log('audits após 2ª apply (delta total):', after.rows[0].n);
  if (after.rows[0].n > mid.rows[0].n) {
    const last = await client.query(
      `SELECT changes FROM cvcrm_lead_updates WHERE id > $1 ORDER BY id DESC LIMIT 1`,
      [before.rows[0].max_id],
    );
    console.log('último changes:', JSON.stringify(last.rows[0]?.changes));
  }
  break;
}

await client.end();
process.exit(0);
