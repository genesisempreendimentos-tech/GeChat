import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import {
  getCvcrmCredentials,
  getNeonLeadsUrl,
  parseCvcrmLeadResponse,
  resolveLeadSourceTable,
} from '../src/services/cvcrmBatchSync.mjs';
import { brtTimestamp } from '../src/services/cvcrmIncrementalSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const { email, token } = getCvcrmCredentials();
const sinceBrt = brtTimestamp(new Date(Date.now() - 20 * 60 * 1000));
const url = `https://genesis.cvcrm.com.br/api/v1/cvdw/leads?a_partir_data_referencia=${encodeURIComponent(sinceBrt)}&registros_por_pagina=3&pagina=1`;
const page = await fetch(url, { headers: { accept: 'application/json', email, token } }).then((r) => r.json());
const lead = page.dados?.[0];
if (!lead) {
  console.log('sem lead');
  process.exit(0);
}

const idlead = String(lead.idlead);
const fields = parseCvcrmLeadResponse(lead);
console.log('CVDW fields:', JSON.stringify(fields, null, 2));

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();
const table = await resolveLeadSourceTable(client, idlead);
console.log('table:', table);

const cols = [
  'cvcrm_situation',
  'cvcrm_status',
  'cvcrm_stage',
  'cvcrm_is_sold',
  'documento_cliente',
  'cvcrm_last_update',
  'idsituacao',
].filter(Boolean);

const r = await client.query(
  `SELECT ${cols.join(', ')} FROM ${table ?? 'leads_cvcrm'} WHERE cvcrm_lead_id = $1`,
  [idlead],
);
console.log('DB row:', JSON.stringify(r.rows[0], (k, v) => (v instanceof Date ? v.toISOString() : v), 2));

// inline same normalize as batch
const AUDIT_DATE_FIELDS = new Set(['cvcrm_last_update']);
const AUDIT_BOOLEAN_FIELDS = new Set(['cvcrm_is_sold']);

function normalizeBooleanToken(value) {
  return String(value).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}
function normalizeAuditBoolean(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const s = normalizeBooleanToken(value);
  if (['sim', 's', 'y', 'yes', 'true', '1'].includes(s)) return true;
  if (['nao', 'n', 'no', 'false', '0'].includes(s)) return false;
  return null;
}
function toAuditIso(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}-03:00`;
  const d = new Date(withTz);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function normalizeAuditText(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s || null;
}
function norm(field, value) {
  if (AUDIT_DATE_FIELDS.has(field)) return toAuditIso(value);
  if (AUDIT_BOOLEAN_FIELDS.has(field)) return normalizeAuditBoolean(value);
  return normalizeAuditText(value);
}

const current = r.rows[0] ?? {};
for (const field of cols) {
  const a = norm(field, current[field]);
  const b = norm(field, fields[field]);
  if (a !== b) {
    console.log(`DIFF ${field}:`, { db: a, cvdw: b, raw_db: current[field], raw_cvdw: fields[field] });
  }
}

await client.end();
process.exit(0);
