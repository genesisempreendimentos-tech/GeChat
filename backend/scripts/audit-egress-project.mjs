/**
 * Estimativa de egress do projeto GeLeads pós-fix (amostra 500 linhas/tabela).
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { ALL_LEADS_REBUILD_SELECT_SQL } from '../src/services/allLeadsUnique.mjs';
import { SOURCE_TABLE_SLIM_SELECT_SQL } from '../src/services/leadSourceSync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

const SAMPLE = 200;

async function avgRowSize(sql, label) {
  const { rows: [r] } = await client.query(`
    SELECT AVG(pg_column_size(x))::int AS avg_bytes, COUNT(*)::int AS n
    FROM (${sql}) x
  `);
  console.log(`${label}: ${r.avg_bytes} bytes/linha (n=${r.n})`);
  return Number(r.avg_bytes) || 0;
}

console.log('=== 1. Rebuild all_leads (já medido) ===');
const rebuildBefore = 1006;
const rebuildAfter = 227;
const { rows: [alCount] } = await client.query(`SELECT COUNT(*)::int AS n FROM all_leads`);
console.log(`  ANTES SELECT *: ~${rebuildBefore} B (amostra anterior)`);
console.log(`  DEPOIS SELECT enxuto: ~${rebuildAfter} B`);
console.log(`  Transfer/rebuild: ${((alCount.n * rebuildAfter) / 1024 / 1024).toFixed(2)} MiB`);

console.log('\n=== 2. Consolidação tabelas-fonte (site_solar_bosque amostra) ===');
const srcFull = await avgRowSize(
  `SELECT * FROM site_solar_bosque ORDER BY random() LIMIT ${SAMPLE}`,
  '  ANTES SELECT *',
);
const slimRow = `ROW(${SOURCE_TABLE_SLIM_SELECT_SQL.split(',').map((c) => c.trim().split(/\s+/)[0]).join(', ')})`;
const srcSlim = await avgRowSize(
  `SELECT ${slimRow} AS r FROM site_solar_bosque ORDER BY random() LIMIT ${SAMPLE}`,
  '  DEPOIS slim (cliente; payload fica server-side no INSERT SELECT)',
);
console.log(`  Nota: consolidação real usa INSERT SELECT — egress cliente ≈ assinatura (~${srcSlim} B) por sync`);

console.log('\n=== 3. cvcrm_reservas (loadReservaFlags) ===');
const resBefore = await avgRowSize(
  `SELECT ROW(idlead, situacao, data_venda, payload) FROM cvcrm_reservas ORDER BY random() LIMIT ${SAMPLE}`,
  '  ANTES com payload jsonb',
);
const resAfter = await avgRowSize(
  `SELECT ROW(idlead, situacao, data_venda, payload->>'data_venda') FROM cvcrm_reservas ORDER BY random() LIMIT ${SAMPLE}`,
  '  DEPOIS só payload_data_venda',
);

const { rows: [resCnt] } = await client.query(
  `SELECT COUNT(*)::int AS n FROM cvcrm_reservas WHERE NULLIF(TRIM(idlead), '') IS NOT NULL`,
);

console.log('\n=== 4. Projeção transfer/dia (cenário típico pós-fix) ===');
const rebuildsPerDay = 8;
const syncsPerDay = 96;
const sourcesPerSync = 14;
const overviewCallsPerDay = 50;

const rebuildMiB = (alCount.n * rebuildAfter) / 1024 / 1024;
const reservaMiB = (resCnt.n * resAfter) / 1024 / 1024;
const signatureMiB = (srcSlim * sourcesPerSync * syncsPerDay) / 1024 / 1024;
const overviewMiB = 0.05 * overviewCallsPerDay;

const dayMiB = rebuildMiB * rebuildsPerDay + reservaMiB * rebuildsPerDay + signatureMiB + overviewMiB;
const monthGiB = (dayMiB * 30) / 1024;

console.log(`  Rebuilds/dia: ${rebuildsPerDay} × ${rebuildMiB.toFixed(2)} MiB = ${(rebuildMiB * rebuildsPerDay).toFixed(2)} MiB`);
console.log(`  Reservas flags/rebuild: ${rebuildsPerDay} × ${reservaMiB.toFixed(2)} MiB = ${(reservaMiB * rebuildsPerDay).toFixed(2)} MiB`);
console.log(`  Assinaturas sync (14 fontes × ${syncsPerDay}/dia): ~${signatureMiB.toFixed(2)} MiB`);
console.log(`  API overview (est.): ~${overviewMiB.toFixed(2)} MiB`);
console.log(`  TOTAL/dia: ~${dayMiB.toFixed(2)} MiB → ~${monthGiB.toFixed(2)} GiB/mês`);
console.log(`  Free Neon (<5 GB/mês): ${monthGiB * 1024 < 5000 ? 'FOLGADO ✓' : 'RISCO ✗'}`);

const rebuildSec = 6;
const cuHrsMonth = (rebuildsPerDay * rebuildSec * 30) / 3600 + 5;
console.log(`\n=== 5. CU-hrs/mês (est.) ===`);
console.log(`  Rebuild compute: ~${((rebuildsPerDay * rebuildSec * 30) / 3600).toFixed(1)} + sync/API ≈ ${cuHrsMonth.toFixed(0)} CU-hr`);
console.log(`  Free Neon (<100 CU-hr): ${cuHrsMonth < 100 ? 'FOLGADO ✓' : 'RISCO ✗'}`);

await client.end();
