/**
 * Aplica migration, roda seed e testa detecção de mudança de situação.
 * Uso: node backend/scripts/seed-and-test-cvcrm-reserva-updates.mjs
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/services/cvcrmBatchSync.mjs';
import {
  parseCvdwReservaRow,
  seedCvcrmReservaUpdatesFromExisting,
  upsertCvcrmReservaRow,
} from '../src/services/cvcrmReservasSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const TEST_IDRESERVA = 2393;

async function applyMigration(client) {
  const sqlPath = path.join(__dirname, '..', 'migrations', 'neon-cvcrm-reserva-updates.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await client.query(sql);
}

async function countUpdates(client) {
  const r = await client.query(`SELECT COUNT(*)::int AS n FROM cvcrm_reserva_updates`);
  return r.rows[0].n;
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
    console.log('=== 1. Migration ===');
    await applyMigration(client);
    console.log('Tabela cvcrm_reserva_updates OK');

    const beforeSeed = await countUpdates(client);
    console.log(`\n=== 2. Seed (antes: ${beforeSeed} linhas) ===`);
    const seed1 = await seedCvcrmReservaUpdatesFromExisting(client);
    const afterSeed1 = await countUpdates(client);
    console.log('Seed rodada 1:', JSON.stringify(seed1));
    console.log(`Linhas após seed: ${afterSeed1} (+${afterSeed1 - beforeSeed})`);

    const seed2 = await seedCvcrmReservaUpdatesFromExisting(client);
    const afterSeed2 = await countUpdates(client);
    console.log('Seed rodada 2 (idempotência):', JSON.stringify(seed2));
    console.log(`Linhas após re-seed: ${afterSeed2} (delta ${afterSeed2 - afterSeed1}, esperado 0)`);

    console.log(`\n=== 3. Simulação mudança idreserva=${TEST_IDRESERVA} ===`);
    const beforeSim = await countUpdates(client);

    const row = await client.query(
      `SELECT * FROM cvcrm_reservas WHERE idreserva = $1`,
      [TEST_IDRESERVA],
    );
    if (row.rowCount === 0) {
      throw new Error(`Reserva ${TEST_IDRESERVA} não encontrada`);
    }
    const original = row.rows[0];
    const originalSituacao = original.situacao;

    await client.query(`UPDATE cvcrm_reservas SET situacao = $2 WHERE idreserva = $1`, [
      TEST_IDRESERVA,
      'Simulacao Antiga',
    ]);

    const raw = {
      ...(original.payload ?? {}),
      idreserva: TEST_IDRESERVA,
      situacao: 'Simulacao Nova',
      data_ultima_alteracao_situacao: '2099-01-01 12:00:00',
    };
    const parsed = parseCvdwReservaRow(raw);
    await upsertCvcrmReservaRow(client, raw);

    const afterSim1 = await countUpdates(client);
    const simRow = await client.query(
      `SELECT situacao_anterior, situacao_nova, changed_at
       FROM cvcrm_reserva_updates
       WHERE idreserva = $1 AND situacao_nova = 'Simulacao Nova'
       ORDER BY observed_at DESC LIMIT 1`,
      [TEST_IDRESERVA],
    );

    console.log(`Após 1ª simulação: ${afterSim1} linhas (+${afterSim1 - beforeSim})`);
    console.log('Registro simulado:', simRow.rows[0] ?? null);

    await upsertCvcrmReservaRow(client, raw);
    const afterSim2 = await countUpdates(client);
    console.log(`Após 2ª simulação (re-run): ${afterSim2} linhas (delta ${afterSim2 - afterSim1}, esperado 0)`);

    await client.query(`UPDATE cvcrm_reservas SET situacao = $2 WHERE idreserva = $1`, [
      TEST_IDRESERVA,
      originalSituacao,
    ]);

    console.log(`\n=== RESUMO ===`);
    console.log(`Seed inseriu: ${afterSeed1 - beforeSeed} linhas (candidatos: ${seed1.candidates})`);
    console.log(`Re-seed duplicou: ${afterSeed2 - afterSeed1 === 0 ? 'não' : 'SIM — ERRO'}`);
    console.log(`Simulação +1: ${afterSim1 - beforeSim === 1 ? 'sim' : 'NÃO — ERRO'}`);
    console.log(`Re-simulação duplicou: ${afterSim2 - afterSim1 === 0 ? 'não' : 'SIM — ERRO'}`);
  } finally {
    await client.end().catch(() => {});
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
