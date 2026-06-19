/**
 * Ingestão re-executável de aliases de empreendimento a partir de all_leads.
 * Uso: node backend/scripts/ingest-empreendimento-aliases.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { refreshEmpreendimentoAliasesFromAllLeads } from '../src/services/refreshEmpreendimentoAliasesFromAllLeads.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const client = new pg.Client({ connectionString: getNeonLeadsUrl(), ssl: { rejectUnauthorized: true } });
await client.connect();

try {
  const result = await refreshEmpreendimentoAliasesFromAllLeads(client);

  const { rows: statsRows } = await client.query(`
    SELECT status, COUNT(*)::int AS n, SUM(ocorrencias)::int AS occ
    FROM empreendimento_aliases
    GROUP BY status
    ORDER BY status
  `);

  const { rows: topRows } = await client.query(`
    SELECT valor_norm, ocorrencias, status, exemplos_crus
    FROM empreendimento_aliases
    ORDER BY ocorrencias DESC, valor_norm
    LIMIT 20
  `);

  const stats = { total: 0, a_classificar: 0, nao_informado: 0, mapeado: 0 };
  for (const row of statsRows) {
    stats[row.status] = row.n;
    stats.total += row.n;
  }

  console.log('=== Ingestão empreendimento_aliases ===');
  console.log(`Valores distintos em all_leads: ${result.distinct_raw_values}`);
  console.log(`Aliases únicos (valor_norm): ${result.distinct_norms}`);
  console.log('');
  console.log('Por status:');
  console.log(`  a_classificar: ${stats.a_classificar}`);
  console.log(`  nao_informado: ${stats.nao_informado}`);
  console.log(`  mapeado:       ${stats.mapeado}`);
  console.log(`  total:         ${stats.total}`);
  console.log('');
  console.log('Top 20 por ocorrencias:');
  for (const row of topRows) {
    const ex = (row.exemplos_crus ?? []).slice(0, 2).join(' | ');
    console.log(`  ${row.ocorrencias.toString().padStart(5)}  [${row.status}]  ${row.valor_norm}  (${ex})`);
  }
} finally {
  await client.end().catch(() => {});
}
