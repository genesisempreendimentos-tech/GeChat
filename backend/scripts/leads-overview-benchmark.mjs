/**
 * Rebuild all_leads_unique (flags precomputados) + benchmark overview + distribuição.
 * Uso: node backend/scripts/leads-overview-benchmark.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { rebuildAllLeadsUnique } from '../src/services/allLeadsUnique.mjs';
import {
  getLeadsOverviewBignumbers,
  getLeadsOverviewCharts,
} from '../src/services/leadsOverviewService.mjs';

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

  console.log('[benchmark] Rebuild all_leads_unique…');
  const rebuild = await rebuildAllLeadsUnique(client);
  console.log('[benchmark] Rebuild:', rebuild);

  const { rows: [counts] } = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM all_leads) AS all_leads,
      (SELECT COUNT(*)::int FROM all_leads_unique) AS all_leads_unique
  `);
  console.log('[benchmark] DB counts:', counts);

  await client.end();

  const t0bn = Date.now();
  const bn = await getLeadsOverviewBignumbers({});
  const msBn = Date.now() - t0bn;

  const t0ch = Date.now();
  const ch = await getLeadsOverviewCharts({});
  const msCh = Date.now() - t0ch;

  console.log('\n=== BigNumbers (default, sem filtro) ===');
  console.log('Tempo:', msBn, 'ms');
  console.log({
    leads_totais: bn.leads_totais.count,
    leads_unicos: bn.leads_unicos.count,
    duplicados: bn.duplicados.count,
    conversao_reserva: bn.converteram_reserva.count,
    conversao_venda: bn.viraram_venda.count,
    reservas_marketing: bn.reservas_marketing.count,
    reservas_externas: bn.reservas_externas.count,
  });
  console.log('Match DB:', bn.leads_totais.count === counts.all_leads && bn.leads_unicos.count === counts.all_leads_unique);

  console.log('\n=== Distribuição por bucket ===');
  console.log('cadastros | pessoas | bucket');
  for (const row of ch.distribuicao.por_canal) {
    console.log(`${String(row.cadastros).padStart(9)} | ${String(row.pessoas).padStart(7)} | ${row.canal}`);
  }

  console.log('\n=== Marketing vs Externo ===');
  for (const row of ch.distribuicao.por_fonte) {
    console.log(`${row.fonte}: cadastros=${row.cadastros}, pessoas=${row.pessoas}`);
  }

  console.log('\n=== Charts ===');
  console.log('Tempo:', msCh, 'ms');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
