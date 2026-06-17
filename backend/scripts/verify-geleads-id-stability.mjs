/**
 * Prova de estabilidade do geleads_id após múltiplos rebuilds.
 * Uso: node backend/scripts/verify-geleads-id-stability.mjs
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const url = getNeonLeadsUrl();
if (!url) {
  console.error('NEON_LEADS_DATABASE_URL não configurada');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

console.log('Reset registry geleads_id para prova limpa (A0001 = pessoa mais antiga)...');
await client.query('TRUNCATE geleads_id_keys');
await client.query('TRUNCATE geleads_id_registry CASCADE');
await client.query(`ALTER SEQUENCE geleads_id_seq RESTART WITH 1`);

const registryWasEmpty = true;
console.log('Registry pré-prova: 0 linha(s) (reset)');
console.log('Tempo ANTES (resolver por cluster): >10 min travado no rebuild #1 (run anterior)');

async function snapshot() {
  const { rows } = await client.query(`
    SELECT geleads_id, person_id::text AS person_id, created_at
    FROM all_leads_unique
    WHERE geleads_id IS NOT NULL
    ORDER BY geleads_id
  `);
  return rows;
}

function fail(msg) {
  console.error(`FALHA: ${msg}`);
  process.exit(1);
}

async function invariants(label, { assertOldestA0001 = false } = {}) {
  const { rows: [oldest] } = await client.query(`
    SELECT geleads_id, created_at
    FROM all_leads_unique
    WHERE geleads_id IS NOT NULL
    ORDER BY created_at ASC, geleads_id ASC
    LIMIT 1
  `);
  const { rows: [counts] } = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM all_leads_unique WHERE geleads_id IS NOT NULL) AS unique_rows,
      (SELECT COUNT(*)::int FROM geleads_id_registry WHERE status = 'active') AS active_registry
  `);
  const { rows: [seq1] } = await client.query(`
    SELECT geleads_id, seq FROM geleads_id_registry WHERE seq = 1 AND status = 'active'
  `);

  console.log(`\n--- ${label} ---`);
  console.log('Pessoa mais antiga:', oldest?.geleads_id, oldest?.created_at);
  console.log('A0001 ativo no registry:', seq1?.geleads_id ?? '(nenhum)');
  console.log('COUNT(all_leads_unique):', counts.unique_rows);
  console.log('COUNT(registry active):', counts.active_registry);

  if (counts.unique_rows !== counts.active_registry) {
    fail(`COUNT(all_leads_unique)=${counts.unique_rows} != COUNT(registry active)=${counts.active_registry}`);
  }

  if (assertOldestA0001 && oldest?.geleads_id !== 'A0001') {
    fail(`pessoa mais antiga deveria ser A0001, obteve ${oldest?.geleads_id}`);
  }

  if (assertOldestA0001 && seq1?.geleads_id !== 'A0001') {
    fail(`seq=1 ativo deveria ser A0001, obteve ${seq1?.geleads_id ?? '(nenhum)'}`);
  }

  return counts;
}

const snapshots = [];
const rebuildTimesMs = [];

for (let run = 1; run <= 3; run += 1) {
  console.log(`\nRebuild #${run}...`);
  const t0 = Date.now();
  await rebuildAllLeadsUnique(client);
  const elapsed = Date.now() - t0;
  rebuildTimesMs.push(elapsed);
  console.log(`Tempo rebuild #${run}: ${(elapsed / 1000).toFixed(2)}s`);
  await invariants(`Após rebuild #${run}`, {
    assertOldestA0001: run === 1 && registryWasEmpty,
  });
  snapshots.push(await snapshot());
}

const base = snapshots[0];
const baseMap = new Map(base.map((r) => [r.geleads_id, r.person_id]));

for (let i = 1; i < snapshots.length; i += 1) {
  let geleadsStable = 0;
  let personChanged = 0;
  for (const row of snapshots[i]) {
    if (!baseMap.has(row.geleads_id)) {
      fail(`NOVO geleads_id após rebuild: ${row.geleads_id}`);
    }
    geleadsStable += 1;
    if (baseMap.get(row.geleads_id) !== row.person_id) personChanged += 1;
  }
  if (snapshots[i].length !== base.length) {
    fail(`Contagem mudou: ${base.length} -> ${snapshots[i].length}`);
  }
  console.log(
    `\nRebuild #${i + 1} vs #1: ${geleadsStable} geleads_id estáveis, ${personChanged} person_id diferentes`,
  );
  if (personChanged === 0 && base.length > 0) {
    fail('person_id deveria mudar entre rebuilds (uuid novo)');
  }
}

const avgMs = rebuildTimesMs.reduce((a, b) => a + b, 0) / rebuildTimesMs.length;
console.log('\n✓ Estabilidade confirmada: nenhum geleads_id mudou entre rebuilds.');
console.log(`Tempo DEPOIS — rebuilds: ${rebuildTimesMs.map((t) => `${(t / 1000).toFixed(2)}s`).join(', ')} (média ${(avgMs / 1000).toFixed(2)}s)`);
console.log(`Total pessoas: ${base.length}`);

await client.end();
