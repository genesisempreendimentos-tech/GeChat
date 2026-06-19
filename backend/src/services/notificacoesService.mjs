import pg from 'pg';
import { getNeonLeadsUrl } from '../lib/neonLeads.mjs';
import { ensureHistoricoSchema } from '../lib/historicoSchema.mjs';
import { enrichHistoricoGeleadsIds } from '../lib/geleadsLookup.mjs';

function mapNotificacaoRow(row) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    entidade: row.entidade,
    geleads_id: row.geleads_id,
    lead_nome: row.lead_nome,
    empreendimento_norm: row.empreendimento_norm,
    valor_de: row.valor_de,
    valor_para: row.valor_para,
    corretor: row.corretor,
    canal: row.canal,
    origem: row.origem,
    ocorrido_em: row.ocorrido_em instanceof Date ? row.ocorrido_em.toISOString() : String(row.ocorrido_em),
    hora_deteccao: Boolean(row.payload?.hora_deteccao),
    lida: Boolean(row.lida),
  };
}

async function getUltimaLeitura(client, userId) {
  const { rows } = await client.query(
    `SELECT ultima_leitura_em FROM notificacoes_leitura WHERE user_id = $1`,
    [userId],
  );
  if (!rows.length) return new Date(0);
  return rows[0].ultima_leitura_em instanceof Date
    ? rows[0].ultima_leitura_em
    : new Date(rows[0].ultima_leitura_em);
}

export async function getNotificacoes(userId, { limit = 20 } = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await ensureHistoricoSchema(client);
    const ultimaLeitura = await getUltimaLeitura(client, userId);

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM historico_movimentacoes
       WHERE ocorrido_em > $1::timestamptz`,
      [ultimaLeitura.toISOString()],
    );
    const naoLidas = countResult.rows[0]?.n ?? 0;

    const { rows } = await client.query(
      `SELECT h.*, (h.ocorrido_em <= $1::timestamptz) AS lida
       FROM historico_movimentacoes h
       ORDER BY h.ocorrido_em DESC, h.id DESC
       LIMIT $2`,
      [ultimaLeitura.toISOString(), safeLimit],
    );

    const enriched = await enrichHistoricoGeleadsIds(client, rows);

    return {
      ultima_leitura_em: ultimaLeitura.toISOString(),
      nao_lidas: naoLidas,
      items: enriched.map(mapNotificacaoRow),
    };
  } finally {
    await client.end().catch(() => {});
  }
}

export async function marcarNotificacoesLidas(userId) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await ensureHistoricoSchema(client);
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO notificacoes_leitura (user_id, ultima_leitura_em)
       VALUES ($1, $2::timestamptz)
       ON CONFLICT (user_id) DO UPDATE SET ultima_leitura_em = EXCLUDED.ultima_leitura_em`,
      [userId, now],
    );
    return { ultima_leitura_em: now };
  } finally {
    await client.end().catch(() => {});
  }
}
