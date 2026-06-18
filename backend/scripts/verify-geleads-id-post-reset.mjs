/**
 * Verificação pós-reset geleads_id (Fase 3) + prova de estabilidade (2 rebuilds extras).
 * NÃO usar verify-geleads-id-stability.mjs em prod (ele trunca antes).
 *
 * Uso: node backend/scripts/verify-geleads-id-post-reset.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';

const EXPECTED = 5698;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

function fail(msg) {
  console.error(`\n✗ FALHA: ${msg}`);
  process.exit(1);
}

async function snapshot(label) {
  const reg = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active')::int AS registros,
      COUNT(*) FILTER (WHERE status = 'merged')::int AS merged,
      MAX(seq)::bigint AS seq_max
    FROM geleads_id_registry
  `);
  const unique = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE geleads_id ~ '^A[0-9]{4}$')::int AS prefix_a,
      COUNT(*) FILTER (WHERE geleads_id IS NOT NULL AND geleads_id !~ '^A[0-9]{4}$')::int AS fora_a,
      MIN(geleads_id) AS min_id,
      MAX(geleads_id) AS max_id,
      COUNT(DISTINCT geleads_id)::int AS ids_distintos
    FROM all_leads_unique
  `);
  const oldest = await client.query(`
    SELECT geleads_id, created_at
    FROM all_leads_unique
    ORDER BY created_at ASC, geleads_id ASC
    LIMIT 1
  `);
  const seq1 = await client.query(`
    SELECT geleads_id, seq FROM geleads_id_registry WHERE seq = 1 AND status = 'active'
  `);
  console.log(`\n=== ${label} ===`);
  console.log('registry:', reg.rows[0]);
  console.log('all_leads_unique:', unique.rows[0]);
  console.log('oldest person:', oldest.rows[0]);
  console.log('seq=1 active:', seq1.rows[0] ?? '(nenhum)');
  return {
    reg: reg.rows[0],
    unique: unique.rows[0],
    oldest: oldest.rows[0],
    seq1: seq1.rows[0],
    ids: (
      await client.query(`SELECT geleads_id FROM all_leads_unique ORDER BY created_at ASC, geleads_id ASC`)
    ).rows.map((r) => r.geleads_id),
    seqMax: Number(reg.rows[0].seq_max ?? 0),
  };
}

const base = await snapshot('Estado inicial');

if (base.reg.registros !== EXPECTED) fail(`registros=${base.reg.registros}, esperado ${EXPECTED}`);
if (base.reg.merged !== 0) fail(`merged=${base.reg.merged}, esperado 0`);
if (base.reg.seq_max !== String(EXPECTED)) fail(`seq_max=${base.reg.seq_max}, esperado ${EXPECTED}`);
if (base.unique.prefix_a !== EXPECTED) fail(`prefixo A: ${base.unique.prefix_a}/${EXPECTED}`);
if (base.unique.fora_a !== 0) fail(`${base.unique.fora_a} id(s) fora da faixa A`);
if (base.unique.min_id !== 'A0001') fail(`min_id=${base.unique.min_id}, esperado A0001`);
if (base.unique.max_id !== 'A5698') fail(`max_id=${base.unique.max_id}, esperado A5698`);
if (base.oldest?.geleads_id !== 'A0001') {
  fail(`pessoa mais antiga deveria ser A0001, obteve ${base.oldest?.geleads_id}`);
}
if (base.seq1?.geleads_id !== 'A0001') {
  fail(`seq=1 ativo deveria ser A0001, obteve ${base.seq1?.geleads_id ?? '(nenhum)'}`);
}

for (let i = 1; i <= 2; i += 1) {
  const seqBefore = base.seqMax;
  const idsBefore = base.ids;
  console.log(`\n[rebuild extra #${i}]...`);
  await rebuildAllLeadsUnique(client);
  const after = await snapshot(`Após rebuild extra #${i}`);
  if (after.seqMax !== seqBefore) {
    fail(`seq_max cresceu: ${seqBefore} → ${after.seqMax} (Fase 1 não pegou)`);
  }
  if (after.ids.length !== idsBefore.length) {
    fail(`contagem de ids mudou após rebuild #${i}`);
  }
  for (let j = 0; j < idsBefore.length; j += 1) {
    if (idsBefore[j] !== after.ids[j]) {
      fail(`geleads_id mudou na posição ${j}: ${idsBefore[j]} → ${after.ids[j]}`);
    }
  }
  console.log(`✓ rebuild #${i}: ids estáveis, seq_max=${after.seqMax}`);
}

console.log('\n✓ Verificação Fase 3 concluída.');
await client.end();
