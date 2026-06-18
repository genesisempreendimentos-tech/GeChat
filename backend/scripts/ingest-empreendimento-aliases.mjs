/**
 * Ingestão re-executável de aliases de empreendimento a partir de all_leads.
 * Uso: node backend/scripts/ingest-empreendimento-aliases.mjs
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { getNeonLeadsUrl } from '../src/lib/neonLeads.mjs';
import { ensureEmpreendimentosSchema } from '../src/lib/empreendimentosSchema.mjs';
import {
  classifyAliasStatus,
  extractEmpreendimentoParts,
} from '../src/lib/normalizeEmpreendimento.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const MAX_EXEMPLOS = 5;

function mergeExemplos(existing, incoming) {
  const set = new Set([...(existing ?? []), ...incoming].filter(Boolean));
  return [...set].slice(0, MAX_EXEMPLOS);
}

async function main() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await ensureEmpreendimentosSchema(client);

    const { rows } = await client.query(`
      SELECT empreendimento_interesse, COUNT(*)::int AS n
      FROM all_leads
      WHERE NULLIF(TRIM(empreendimento_interesse), '') IS NOT NULL
      GROUP BY empreendimento_interesse
    `);

    /** @type {Map<string, { ocorrencias: number, exemplos: Set<string> }>} */
    const aggregated = new Map();

    for (const row of rows) {
      const parts = extractEmpreendimentoParts(row.empreendimento_interesse);
      for (const { valorNorm, exemploCru } of parts) {
        if (!valorNorm) continue;
        const prev = aggregated.get(valorNorm) ?? { ocorrencias: 0, exemplos: new Set() };
        prev.ocorrencias += row.n;
        prev.exemplos.add(exemploCru);
        aggregated.set(valorNorm, prev);
      }
    }

    for (const [valorNorm, data] of aggregated) {
      const status = classifyAliasStatus(valorNorm);
      const exemplos = [...data.exemplos];

      const { rows: existingRows } = await client.query(
        `SELECT id, exemplos_crus, status FROM empreendimento_aliases WHERE valor_norm = $1`,
        [valorNorm],
      );

      if (existingRows.length) {
        const existing = existingRows[0];
        const mergedExemplos = mergeExemplos(existing.exemplos_crus, exemplos);
        const nextStatus = existing.status === 'mapeado' ? 'mapeado' : status;
        await client.query(
          `UPDATE empreendimento_aliases
           SET ocorrencias = $2, exemplos_crus = $3, status = $4, updated_at = now()
           WHERE id = $1`,
          [existing.id, data.ocorrencias, mergedExemplos, nextStatus],
        );
      } else {
        await client.query(
          `INSERT INTO empreendimento_aliases (valor_norm, exemplos_crus, ocorrencias, status, updated_at)
           VALUES ($1, $2, $3, $4, now())`,
          [valorNorm, exemplos, data.ocorrencias, status],
        );
      }
    }

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
    console.log(`Valores distintos em all_leads: ${rows.length}`);
    console.log(`Aliases únicos (valor_norm): ${aggregated.size}`);
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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
