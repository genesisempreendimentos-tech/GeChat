/**
 * Atualiza empreendimento_aliases a partir de all_leads.empreendimento_interesse.
 * Fonte de verdade: cada parte (split ';') conta como ocorrência de cadastro.
 */
import { ensureEmpreendimentosSchema } from '../lib/empreendimentosSchema.mjs';
import {
  classifyAliasStatus,
  extractEmpreendimentoParts,
} from '../lib/normalizeEmpreendimento.mjs';
import { invalidateEmpreendimentoResolver } from './empreendimentoResolver.mjs';
import { sqlCoalesceEmpreendimentoInteresse } from '../lib/empreendimentoInteresseNull.mjs';

const MAX_EXEMPLOS = 5;

function mergeExemplos(existing, incoming) {
  const set = new Set([...(existing ?? []), ...incoming].filter(Boolean));
  return [...set].slice(0, MAX_EXEMPLOS);
}

/** Re-sincroniza ocorrencias/exemplos/status a partir de all_leads. */
export async function refreshEmpreendimentoAliasesFromAllLeads(client, { invalidateResolver = true } = {}) {
  await ensureEmpreendimentosSchema(client);

  const { rows } = await client.query(`
    SELECT ${sqlCoalesceEmpreendimentoInteresse('empreendimento_interesse')} AS empreendimento_interesse,
           COUNT(*)::int AS n
    FROM all_leads
    GROUP BY 1
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

  let upserted = 0;
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
    upserted += 1;
  }

  if (invalidateResolver) invalidateEmpreendimentoResolver();

  return {
    distinct_raw_values: rows.length,
    distinct_norms: aggregated.size,
    upserted,
  };
}
