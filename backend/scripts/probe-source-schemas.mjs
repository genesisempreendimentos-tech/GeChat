import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { VALID_SOURCE_TABLES } from '../src/services/cvcrmBatchSync.mjs';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const CANONICAL = new Set([
  'id', 'created_at', 'updated_at', 'name', 'email', 'phone', 'gender', 'birth_date',
  'current_city', 'relationship_status', 'monthly_investment', 'profile_type',
  'profile_completed', 'whatsapp_clicked', 'canal', 'empreendimento_interesse', 'parameter',
  'codigo', 'cvcrm_lead_id', 'cvcrm_status', 'cvcrm_situation', 'cvcrm_stage',
  'cvcrm_is_sold', 'cvcrm_sale_value', 'cvcrm_sale_date', 'cvcrm_last_update',
  'cvcrm_payload', 'cvcrm_sync_status', 'cvcrm_sync_error', 'cvcrm_last_synced_at',
]);

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const report = { tables: {}, leads_antigos_dates: null };

for (const table of VALID_SOURCE_TABLES) {
  const cols = await client.query(
    `SELECT column_name, data_type, udt_name, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  const names = cols.rows.map((r) => r.column_name);
  const nonCanonical = names.filter((n) => !CANONICAL.has(n));
  report.tables[table] = {
    columns: cols.rows,
    nonCanonical,
    rowCount: (await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`)).rows[0].n,
  };
}

if (report.tables.leads_antigos) {
  const nasc = await client.query(
    `SELECT nascimento, birth_date FROM leads_antigos
     WHERE nascimento IS NOT NULL OR birth_date IS NOT NULL
     ORDER BY created_at NULLS LAST LIMIT 10`,
  );
  const samples = await client.query(
    `SELECT nascimento, birth_date, data_entrada, created_at FROM leads_antigos LIMIT 10`,
  );
  report.leads_antigos_dates = { withDates: nasc.rows, first10: samples.rows };
}

console.log(JSON.stringify(report, null, 2));
await client.end();
