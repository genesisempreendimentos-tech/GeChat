/**
 * Diagnóstico crú de sinais de canal (Fase 1).
 * Uso: node backend/scripts/probe-leads-canal-distribution.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { resolveProvisionalCanal } from '../src/lib/leadsCanalMap.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

function printSection(title, rows) {
  console.log(`\n=== ${title} ===`);
  if (!rows.length) {
    console.log('(vazio)');
    return;
  }
  const maxLabel = Math.max(...rows.map((r) => String(r.label ?? r.value ?? '').length), 8);
  for (const row of rows) {
    const label = String(row.label ?? row.value ?? '(null)');
    console.log(`  ${label.padEnd(maxLabel)}  ${row.count}`);
  }
  console.log(`  TOTAL  ${rows.reduce((s, r) => s + Number(r.count), 0)}`);
}

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const canalCol = await client.query(`
      SELECT COALESCE(NULLIF(TRIM(canal), ''), '(vazio)') AS label, COUNT(*)::int AS count
      FROM all_leads
      GROUP BY 1
      ORDER BY count DESC, label
      LIMIT 40
    `);
    printSection('all_leads.canal (top 40)', canalCol.rows);

    const sourceTable = await client.query(`
      SELECT source_table AS label, COUNT(*)::int AS count
      FROM all_leads
      GROUP BY 1
      ORDER BY count DESC, label
    `);
    printSection('all_leads.source_table', sourceTable.rows);

    const cvOrigem = await client.query(`
      SELECT COALESCE(NULLIF(TRIM(cvcrm_payload->>'origem'), ''), '(vazio)') AS label, COUNT(*)::int AS count
      FROM all_leads
      WHERE source_table = 'leads_cvcrm'
      GROUP BY 1
      ORDER BY count DESC, label
    `);
    printSection('leads_cvcrm — payload.origem', cvOrigem.rows);

    const cvOrigemNome = await client.query(`
      SELECT COALESCE(NULLIF(TRIM(cvcrm_payload->>'origem_nome'), ''), '(vazio)') AS label, COUNT(*)::int AS count
      FROM all_leads
      WHERE source_table = 'leads_cvcrm'
      GROUP BY 1
      ORDER BY count DESC, label
      LIMIT 30
    `);
    printSection('leads_cvcrm — payload.origem_nome (top 30)', cvOrigemNome.rows);

    const cvMidia = await client.query(`
      SELECT COALESCE(NULLIF(TRIM(cvcrm_payload->>'midia_original'), ''), '(vazio)') AS label, COUNT(*)::int AS count
      FROM all_leads
      WHERE source_table = 'leads_cvcrm'
      GROUP BY 1
      ORDER BY count DESC, label
      LIMIT 30
    `);
    printSection('leads_cvcrm — payload.midia_original (top 30)', cvMidia.rows);

    const { rows: sampleRows } = await client.query(`
      SELECT source_table, canal, cvcrm_payload
      FROM all_leads
      ORDER BY created_at DESC
      LIMIT 5000
    `);
    const provisional = new Map();
    for (const row of sampleRows) {
      const label = resolveProvisionalCanal(row);
      provisional.set(label, (provisional.get(label) ?? 0) + 1);
    }
    printSection(
      'De-para PROVISÓRIO (amostra últimos 5000 cadastros)',
      [...provisional.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    );

    const { rows: allForProv } = await client.query(`
      SELECT source_table, canal, cvcrm_payload FROM all_leads
    `);
    const provFull = new Map();
    for (const row of allForProv) {
      const label = resolveProvisionalCanal(row);
      provFull.set(label, (provFull.get(label) ?? 0) + 1);
    }
    printSection(
      'De-para PROVISÓRIO (base completa all_leads)',
      [...provFull.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count),
    );
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
