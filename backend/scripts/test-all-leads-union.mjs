/**
 * Testa consolidação all_leads = união pura das 14 fontes.
 * Uso: node backend/scripts/test-all-leads-union.mjs
 */
import 'dotenv/config';
import pg from 'pg';
import { syncLeadsFromSources } from '../src/services/leadSourceSync.mjs';

const SOURCE_TABLES = [
  'campanha_niver_208_anos_friburgo',
  'campanha_blackgenesis',
  'site_flow',
  'site_gesite',
  'site_kastell',
  'site_nature',
  'site_oasis_i',
  'site_oasis_ii',
  'leads_antigos',
  'site_solar_bellavista',
  'site_solar_bosque',
  'site_solar_flores',
  'site_vita',
  'leads_cvcrm',
];

async function main() {
  const url = process.env.NEON_LEADS_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  console.log('Rodando syncLeadsFromSources({ force: true })...');
  const syncResult = await syncLeadsFromSources({ force: true });
  console.log('Sync:', JSON.stringify(syncResult, null, 2));

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const { rows: totalRows } = await client.query('SELECT COUNT(*)::int AS n FROM all_leads');
    const allLeadsTotal = totalRows[0]?.n ?? 0;

    let sourcesSum = 0;
    const perSource = [];

    for (const table of SOURCE_TABLES) {
      try {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
        const n = rows[0]?.n ?? 0;
        sourcesSum += n;
        perSource.push({ table, count: n });
      } catch (err) {
        if (err?.code === '42P01') {
          perSource.push({ table, count: 0, missing: true });
        } else {
          throw err;
        }
      }
    }

    const { rows: dupCodigo } = await client.query(
      `SELECT codigo, COUNT(*)::int AS n
       FROM all_leads
       WHERE codigo IS NOT NULL AND TRIM(codigo) <> ''
       GROUP BY codigo
       HAVING COUNT(*) > 1
       ORDER BY n DESC
       LIMIT 5`,
    );

    console.log('\n=== RESULTADO ===');
    console.log(`all_leads total: ${allLeadsTotal}`);
    console.log(`soma das 14 fontes: ${sourcesSum}`);
    console.log(`diferença: ${allLeadsTotal - sourcesSum}`);
    console.log('\nPor fonte:');
    for (const row of perSource) {
      console.log(`  ${row.table}: ${row.count}${row.missing ? ' (tabela ausente)' : ''}`);
    }
    if (dupCodigo.length > 0) {
      console.log('\nCodigos duplicados em all_leads (esperado na união pura):');
      for (const row of dupCodigo) {
        console.log(`  ${row.codigo}: ${row.n} linhas`);
      }
    }

    if (allLeadsTotal !== sourcesSum) {
      console.warn('\nAVISO: totais não batem exatamente — verifique fontes ausentes ou erros no sync.');
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
