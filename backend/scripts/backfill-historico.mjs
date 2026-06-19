/**
 * Repopula historico_movimentacoes do zero (após reset geleads_id faixa A).
 *
 * Pré-requisito: all_leads_unique com geleads_id estável na faixa A.
 *
 * Uso:
 *   node backend/scripts/backfill-historico.mjs
 *   node backend/scripts/backfill-historico.mjs --skip-reset   (só append idempotente)
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { resetHistoricoProjection } from '../src/services/historicoService.mjs';
import { runHistoricoProjection } from '../src/services/historicoProjectionService.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });


async function assertGeleadsIdReset(client) {
  const { rows } = await client.query(`
    SELECT
      COUNT(*)::int AS total_com_id,
      COUNT(*) FILTER (WHERE geleads_id ~ '^A[0-9]{4}$')::int AS prefix_a,
      COUNT(*) FILTER (WHERE geleads_id IS NOT NULL AND geleads_id !~ '^A[0-9]{4}$')::int AS fora_faixa_a,
      COUNT(*) FILTER (WHERE geleads_id ~ '^[BC][0-9]{4}$')::int AS prefix_bc,
      COUNT(DISTINCT geleads_id)::int AS ids_distintos
    FROM all_leads_unique
    WHERE geleads_id IS NOT NULL
  `);

  const s = rows[0];
  const expected = Number(s.total_com_id);
  console.log('[historico] geleads_id check:', s);

  if (expected < 1) {
    throw new Error('Abortado: nenhum geleads_id em all_leads_unique.');
  }
  if (Number(s.prefix_a) !== expected) {
    throw new Error(`Abortado: nem todos os ids estão na faixa A#### (${s.prefix_a}/${expected}).`);
  }
  if (Number(s.prefix_bc) > 0) {
    throw new Error(`Abortado: ainda existem ${s.prefix_bc} ids com prefixo B/C.`);
  }
  if (Number(s.fora_faixa_a) > 0) {
    throw new Error(`Abortado: ${s.fora_faixa_a} geleads_id fora do padrão A####.`);
  }
  if (Number(s.ids_distintos) !== expected) {
    throw new Error(`Abortado: geleads_id duplicados (${s.ids_distintos} distintos vs ${expected}).`);
  }
  console.log(`[historico] ✓ geleads_id reset verificado (${expected} · faixa A)`);
}

async function printVerification(client) {
  console.log('\n=== Verificação pós-backfill ===');

  const byTipo = await client.query(`
    SELECT tipo, COUNT(*)::int AS total
    FROM historico_movimentacoes
    GROUP BY tipo
    ORDER BY tipo
  `);
  console.log('\nCOUNT por tipo:');
  for (const row of byTipo.rows) {
    console.log(`  ${row.tipo}: ${row.total}`);
  }

  const orphan = await client.query(`
    SELECT COUNT(*)::int AS orfaos
    FROM historico_movimentacoes h
    WHERE h.geleads_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM all_leads_unique u WHERE u.geleads_id = h.geleads_id
      )
  `);
  console.log(`\nIds órfãos (geleads_id ∉ all_leads_unique): ${orphan.rows[0].orfaos}`);

  const sample = await client.query(`
    SELECT h.tipo, h.geleads_id, h.lead_nome, h.ocorrido_em
    FROM historico_movimentacoes h
    WHERE h.geleads_id IS NOT NULL
    ORDER BY h.ocorrido_em DESC
    LIMIT 10
  `);
  console.log('\nAmostra (10 linhas · faixa A):');
  console.table(sample.rows);
}

async function main() {
  const skipReset = process.argv.includes('--skip-reset');
  const url = getNeonLeadsUrl();
  if (!url) {
    console.error('NEON_LEADS_DATABASE_URL não configurada');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await assertGeleadsIdReset(client);

    if (!skipReset) {
      console.log('\n[historico] TRUNCATE historico_movimentacoes + zerar watermarks…');
      await resetHistoricoProjection(client);
      console.log('[historico] ✓ feed e cursores zerados (notificacoes_leitura intacto)');
    }

    console.log('\n[historico] Iniciando projeção (backfill idempotente)…');
    const result = await runHistoricoProjection(client, { incremental: false });
    console.log('\n=== Seed reserva updates ===');
    console.log(JSON.stringify(result.seed, null, 2));
    console.log('\n=== Projetado (inseridos nesta rodada) ===');
    console.log(JSON.stringify(result.projected, null, 2));
    console.log('\n=== Contagem por tipo (tabela) ===');
    for (const row of result.stats) {
      console.log(
        `${row.tipo}: ${row.total} | ${row.min_ocorrido?.toISOString?.() ?? row.min_ocorrido} → ${row.max_ocorrido?.toISOString?.() ?? row.max_ocorrido}`,
      );
    }

    await printVerification(client);
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
