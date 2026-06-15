/**
 * Backfill completo cvcrm_reservas via CVDW.
 * Uso: node backend/scripts/backfill-cvcrm-reservas.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import { backfillCvcrmReservasFromCvdw } from '../src/services/cvcrmReservasSync.mjs';

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

  try {
    const before = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_reservas`);
    console.log(`Antes: ${before.rows[0].n} linha(s)`);

    const result = await backfillCvcrmReservasFromCvdw(client, {
      sinceBrt: '2000-01-01 00:00:00',
    });
    console.log('Backfill:', JSON.stringify(result, null, 2));

    const after = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_reservas`);
    const situacao = await client.query(
      `SELECT COALESCE(NULLIF(TRIM(situacao), ''), '(vazio)') AS situacao,
              COUNT(*)::int AS n
       FROM cvcrm_reservas
       GROUP BY 1
       ORDER BY n DESC`,
    );

    console.log(`\n=== COUNT final: ${after.rows[0].n} ===`);
    console.log('\n=== GROUP BY situacao ===');
    for (const row of situacao.rows) {
      console.log(`  ${row.situacao}: ${row.n}`);
    }
  } finally {
    await client.end().catch(() => {});
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
