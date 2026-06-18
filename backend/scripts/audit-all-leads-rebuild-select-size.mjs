/**
 * Estima economia de transferência: SELECT * vs SELECT enxuto do rebuild.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { ALL_LEADS_REBUILD_SELECT_SQL } from '../src/services/allLeadsUnique.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const { rows: [full] } = await client.query(`
  SELECT
    COUNT(*)::int AS rows,
    AVG(pg_column_size(t))::int AS avg_bytes,
    SUM(pg_column_size(t))::bigint AS total_bytes
  FROM (SELECT * FROM all_leads ORDER BY random() LIMIT 500) t
`);

const slimSelect = `
  ROW(
    id, source_table, created_at, updated_at, name, email, phone,
    gender, birth_date, current_city, relationship_status, monthly_investment,
    profile_type, profile_completed, whatsapp_clicked, canal, empreendimento_interesse,
    parameter, children_status, cvcrm_lead_id, cvcrm_status, cvcrm_situation,
    cvcrm_stage, cvcrm_is_sold, cvcrm_sale_value, cvcrm_sale_date, cvcrm_last_update,
    cvcrm_payload->>'idcorretor', cvcrm_payload->>'idimobiliaria'
  )
`;

const { rows: [slim] } = await client.query(`
  SELECT
    COUNT(*)::int AS rows,
    AVG(pg_column_size(${slimSelect}))::int AS avg_bytes,
    SUM(pg_column_size(${slimSelect}))::bigint AS total_bytes
  FROM (SELECT * FROM all_leads ORDER BY random() LIMIT 500) al
`);

const { rows: [payloadOnly] } = await client.query(`
  SELECT AVG(pg_column_size(cvcrm_payload))::int AS avg_payload_bytes
  FROM (SELECT cvcrm_payload FROM all_leads WHERE cvcrm_payload IS NOT NULL ORDER BY random() LIMIT 500) s
`);

const savedPct = full.avg_bytes
  ? Math.round((1 - slim.avg_bytes / full.avg_bytes) * 1000) / 10
  : 0;

console.log('Amostra: 500 linhas aleatórias de all_leads');
console.log('Linhas amostradas:', full.rows);
console.log('');
console.log('ANTES (SELECT * / linha inteira):');
console.log(`  pg_column_size médio: ${full.avg_bytes} bytes`);
console.log(`  transfer estimado:    ${(Number(full.total_bytes) / 1024 / 1024).toFixed(2)} MiB`);
console.log('');
console.log('DEPOIS (SELECT enxuto rebuild):');
console.log(`  pg_column_size médio: ${slim.avg_bytes} bytes`);
console.log(`  transfer estimado:    ${(Number(slim.total_bytes) / 1024 / 1024).toFixed(2)} MiB`);
console.log(`  economia:             ${savedPct}% por linha`);
console.log('');
console.log(`cvcrm_payload médio (quando não nulo): ${payloadOnly.avg_payload_bytes ?? 0} bytes`);
console.log('');
console.log('Colunas do SELECT enxuto:');
console.log(ALL_LEADS_REBUILD_SELECT_SQL.replace(/\s+/g, ' '));

await client.end();
