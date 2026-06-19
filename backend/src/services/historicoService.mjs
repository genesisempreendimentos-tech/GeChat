import pg from 'pg';
import { getNeonLeadsUrl } from '../lib/neonLeads.mjs';
import { ensureHistoricoSchema } from '../lib/historicoSchema.mjs';
import { enrichHistoricoGeleadsIds } from '../lib/geleadsLookup.mjs';
import { loadEmpreendimentoResolver } from './empreendimentoResolver.mjs';

const VALID_TIPOS = new Set([
  'lead_criado',
  'lead_mudou_situacao',
  'reserva_criada',
  'reserva_mudou_situacao',
]);

function parseTipos(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',');
  return list.map((t) => t.trim()).filter((t) => VALID_TIPOS.has(t));
}

async function resolveEmpreendimentoFilterNorms(client, canonicalName) {
  const name = String(canonicalName ?? '').trim();
  if (!name) return [];

  await loadEmpreendimentoResolver(client);

  const norms = new Set([name]);
  const { rows } = await client.query(
    `SELECT a.valor_norm
     FROM empreendimento_aliases a
     JOIN empreendimentos_genesis g ON g.id = a.empreendimento_id
     WHERE g.nome = $1 AND a.status = 'mapeado'`,
    [name],
  );
  for (const row of rows) {
    if (row.valor_norm) norms.add(String(row.valor_norm).trim());
  }
  return [...norms];
}

function mapHistoricoRow(row) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    entidade: row.entidade,
    geleads_id: row.geleads_id,
    cvcrm_lead_id: row.cvcrm_lead_id != null ? Number(row.cvcrm_lead_id) : null,
    cvcrm_reserva_id: row.cvcrm_reserva_id != null ? Number(row.cvcrm_reserva_id) : null,
    lead_nome: row.lead_nome,
    empreendimento_cru: row.empreendimento_cru,
    empreendimento_norm: row.empreendimento_norm,
    canal: row.canal,
    fonte: row.fonte,
    valor_de: row.valor_de,
    valor_para: row.valor_para,
    corretor: row.corretor,
    origem: row.origem,
    ocorrido_em: row.ocorrido_em instanceof Date ? row.ocorrido_em.toISOString() : String(row.ocorrido_em),
    hora_deteccao: Boolean(row.payload?.hora_deteccao),
    payload: row.payload ?? null,
  };
}

export async function listHistoricoMovimentacoes(filters = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 100);
  const offset = (page - 1) * limit;

  const tipos = parseTipos(filters.tipo ?? filters.tipos);
  const params = [];
  const clauses = ['1=1'];

  if (tipos.length) {
    params.push(tipos);
    clauses.push(`h.tipo = ANY($${params.length}::text[])`);
  }

  if (filters.data_de) {
    params.push(String(filters.data_de));
    clauses.push(`h.ocorrido_em >= $${params.length}::date`);
  }
  if (filters.data_ate) {
    params.push(String(filters.data_ate));
    clauses.push(`h.ocorrido_em < ($${params.length}::date + interval '1 day')`);
  }

  if (filters.busca?.trim()) {
    params.push(`%${filters.busca.trim()}%`);
    const idx = params.length;
    params.push(filters.busca.trim());
    const exactIdx = params.length;
    clauses.push(`(
      h.lead_nome ILIKE $${idx}
      OR h.geleads_id ILIKE $${idx}
      OR UPPER(TRIM(h.geleads_id)) = UPPER($${exactIdx})
    )`);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await ensureHistoricoSchema(client);

    if (filters.empreendimento?.trim()) {
      const norms = await resolveEmpreendimentoFilterNorms(client, filters.empreendimento.trim());
      if (norms.length) {
        params.push(norms);
        clauses.push(`(
          h.empreendimento_norm = ANY($${params.length}::text[])
          OR h.empreendimento_cru = ANY($${params.length}::text[])
        )`);
      }
    }

    const whereSql = clauses.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM historico_movimentacoes h WHERE ${whereSql}`,
      params,
    );
    const total = countResult.rows[0]?.total ?? 0;

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows } = await client.query(
      `SELECT h.*
       FROM historico_movimentacoes h
       WHERE ${whereSql}
       ORDER BY h.ocorrido_em DESC, h.id DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const enriched = await enrichHistoricoGeleadsIds(client, rows);

    return {
      rows: enriched.map(mapHistoricoRow),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

/** Projeção só via `node backend/scripts/backfill-historico.mjs` (não auto na boot/sync). */
export async function resetHistoricoProjection(client) {
  await ensureHistoricoSchema(client);
  await client.query('TRUNCATE historico_movimentacoes');
  await client.query('DELETE FROM historico_projection_cursors');
}
