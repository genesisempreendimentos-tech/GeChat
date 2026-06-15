import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  getCvcrmCredentials,
  getNeonLeadsUrl,
  resolveLeadSourceTable,
} from '../src/services/cvcrmBatchSync.mjs';
import { brtTimestamp } from '../src/services/cvcrmIncrementalSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

function formatBrt(d) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = String(Number(p.hour) % 24).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
}

const { email, token } = getCvcrmCredentials();
const sinceBrt = brtTimestamp(new Date(Date.now() - 30 * 60 * 1000));
const url = `https://genesis.cvcrm.com.br/api/v1/cvdw/leads?a_partir_data_referencia=${encodeURIComponent(sinceBrt)}&registros_por_pagina=5&pagina=1`;
const page = await fetch(url, { headers: { accept: 'application/json', email, token } }).then((r) => r.json());

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

let checked = 0;
let matched = 0;

for (const lead of (page.dados || []).slice(0, 5)) {
  const idlead = String(lead.idlead);
  const cvdw = String(lead.data_ultima_alteracao || '').trim().slice(0, 19);
  const table = await resolveLeadSourceTable(client, idlead);
  if (!table) {
    console.log(`idlead ${idlead}: sem tabela-fonte`);
    continue;
  }

  const r = await client.query(
    `SELECT cvcrm_last_update FROM ${table} WHERE cvcrm_lead_id = $1`,
    [idlead],
  );
  if (!r.rows[0]?.cvcrm_last_update) {
    console.log(`idlead ${idlead}: sem cvcrm_last_update no DB`);
    continue;
  }

  const pgBrt = formatBrt(r.rows[0].cvcrm_last_update);
  const ok = pgBrt === cvdw;
  checked += 1;
  if (ok) matched += 1;
  console.log(`idlead ${idlead} | CVDW: ${cvdw} | PG BRT: ${pgBrt} | ${ok ? 'OK' : 'DIVERGE'}`);
}

console.log('---');
console.log(`Conferidos: ${checked} | Batem: ${matched}`);

await client.end();
process.exit(checked > 0 && matched === checked ? 0 : 1);
