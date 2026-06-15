/**
 * Backfill pescaria: leads com reserva → Neon (leads_cvcrm + consolidação).
 * Uso: node backend/scripts/backfill-pescaria-leads.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getCompetenciaReport } from '../src/services/cvcrmCadastrosSync.mjs';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import { runPescariaBackfill } from '../src/services/cvcrmPescaria.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  const before = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM leads_cvcrm) AS leads_cvcrm,
       (SELECT COUNT(*)::int FROM all_leads) AS all_leads,
       (SELECT COUNT(*)::int FROM all_leads_unique) AS all_leads_unique`,
  );
  await client.end();

  console.log('=== ANTES ===');
  console.log(before.rows[0]);

  const result = await runPescariaBackfill({ autoLimitSince: true });
  console.log('\n=== BACKFILL ===');
  console.log(JSON.stringify(result, null, 2));

  const competencia = await getCompetenciaReport();
  const rafael = competencia.ranking.find((r) => r.idcorretor === '284');
  const top5 = competencia.ranking.slice(0, 5);

  console.log('\n=== COMPETÊNCIA (totais) ===');
  console.log(JSON.stringify(competencia.totais, null, 2));
  console.log('\n=== TOP 5 ranking ===');
  console.log(JSON.stringify(top5, null, 2));
  console.log('\n=== RAFAEL (284) ===');
  console.log(JSON.stringify(rafael ?? null, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
