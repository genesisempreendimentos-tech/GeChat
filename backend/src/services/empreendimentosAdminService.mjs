import pg from 'pg';
import { getNeonLeadsUrl } from '../lib/neonLeads.mjs';
import { ensureEmpreendimentosSchema } from '../lib/empreendimentosSchema.mjs';
import { normalizeEmpreendimentoColorToken } from '../lib/empreendimentoColor.mjs';
import {
  extractEmpreendimentoParts,
  normalizeEmpreendimento,
} from '../lib/normalizeEmpreendimento.mjs';
import { invalidateEmpreendimentoResolver } from './empreendimentoResolver.mjs';

const SIMILARITY_THRESHOLD = 0.45;

function toAliasDto(row) {
  return {
    id: row.id,
    valor_norm: row.valor_norm,
    exemplos_crus: row.exemplos_crus ?? [],
    ocorrencias: row.ocorrencias,
    empreendimento_id: row.empreendimento_id,
    status: row.status,
  };
}

async function fetchAliasStats(client) {
  const { rows } = await client.query(`
    SELECT status, COUNT(*)::int AS n
    FROM empreendimento_aliases
    GROUP BY status
  `);
  const stats = { total: 0, a_classificar: 0, mapeado: 0, nao_informado: 0 };
  for (const row of rows) {
    stats[row.status] = row.n;
    stats.total += row.n;
  }
  return stats;
}

async function clusterAClassificar(client, aliases) {
  const assigned = new Set();
  const clusters = [];
  const sorted = [...aliases].sort((a, b) => b.ocorrencias - a.ocorrencias);

  for (const seed of sorted) {
    if (assigned.has(seed.id)) continue;

    const { rows: similar } = await client.query(
      `SELECT id, valor_norm, exemplos_crus, ocorrencias, empreendimento_id, status
       FROM empreendimento_aliases
       WHERE status = 'a_classificar'
         AND similarity(valor_norm, $1) > $2
       ORDER BY ocorrencias DESC, valor_norm`,
      [seed.valor_norm, SIMILARITY_THRESHOLD],
    );

    const members = similar.filter((row) => !assigned.has(row.id));
    if (!members.length) {
      assigned.add(seed.id);
      clusters.push({
        cluster_id: `c_${seed.id}`,
        representative: seed.valor_norm,
        total_ocorrencias: seed.ocorrencias,
        aliases: [toAliasDto(seed)],
      });
      continue;
    }

    for (const member of members) assigned.add(member.id);
    clusters.push({
      cluster_id: `c_${seed.id}`,
      representative: members[0].valor_norm,
      total_ocorrencias: members.reduce((sum, row) => sum + row.ocorrencias, 0),
      aliases: members.map(toAliasDto),
    });
  }

  return clusters;
}

function singletonClusters(aliases) {
  return aliases.map((row) => ({
    cluster_id: `s_${row.id}`,
    representative: row.valor_norm,
    total_ocorrencias: row.ocorrencias,
    aliases: [toAliasDto(row)],
  }));
}

export async function listAliasClusters(client, { statusFilter = null } = {}) {
  await ensureEmpreendimentosSchema(client);

  let whereSql = '1=1';
  const params = [];
  if (statusFilter) {
    params.push(statusFilter);
    whereSql = `status = $${params.length}`;
  }

  const { rows } = await client.query(
    `SELECT id, valor_norm, exemplos_crus, ocorrencias, empreendimento_id, status
     FROM empreendimento_aliases
     WHERE ${whereSql}
     ORDER BY ocorrencias DESC, valor_norm`,
    params,
  );

  const aClassificar = rows.filter((row) => row.status === 'a_classificar');
  const others = rows.filter((row) => row.status !== 'a_classificar');

  const suggested = statusFilter === 'mapeado' || statusFilter === 'nao_informado'
    ? []
    : await clusterAClassificar(client, aClassificar);

  const singletons = statusFilter === 'a_classificar'
    ? []
    : singletonClusters(others);

  const stats = await fetchAliasStats(client);

  return {
    clusters: [...suggested, ...singletons],
    unclustered: [],
    stats,
  };
}

export async function createEmpreendimentoGenesis(client, nome) {
  await ensureEmpreendimentosSchema(client);
  const trimmed = String(nome ?? '').trim();
  if (!trimmed) throw Object.assign(new Error('Nome é obrigatório.'), { statusCode: 400 });

  const { rows } = await client.query(
    `INSERT INTO empreendimentos_genesis (nome) VALUES ($1)
     RETURNING id, nome, ativo`,
    [trimmed],
  );
  return rows[0];
}

function normalizeAliasIds(aliasIds) {
  return [...new Set((aliasIds ?? []).map((id) => Number(id)).filter((id) => id > 0))];
}

function splitIdleadIds(idlead) {
  const raw = String(idlead ?? '').trim();
  if (!raw) return [];
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}

function matchEmpreendimentoIds(valorNorm, normsByEmp) {
  const matched = new Set();
  if (!valorNorm) return matched;
  for (const [empId, norms] of normsByEmp) {
    if (norms.has(valorNorm)) matched.add(empId);
  }
  return matched;
}

function matchEmpreendimentoIdsFromRaw(raw, normsByEmp) {
  const matched = new Set();
  for (const { valorNorm } of extractEmpreendimentoParts(raw)) {
    for (const empId of matchEmpreendimentoIds(valorNorm, normsByEmp)) {
      matched.add(empId);
    }
  }
  return matched;
}

function emptyEmpreendimentoStats() {
  return { qualificados: 0, vendas: 0, reservas: 0, v_andamento: 0 };
}

function ensureEmpreendimentoStats(stats, empId) {
  if (!stats.has(empId)) stats.set(empId, emptyEmpreendimentoStats());
  return stats.get(empId);
}

function reservaHasSaleDate(reserva) {
  const payloadDate = String(reserva.payload_data_venda ?? '').trim();
  return reserva.data_venda != null || payloadDate !== '';
}

function isReservaVendaAndamento(reserva) {
  if (!reservaHasSaleDate(reserva)) return false;
  const situacao = String(reserva.situacao ?? '').trim();
  return situacao === 'Contrato de Compra e Venda Gerado' || situacao === 'Envio Sienge';
}

async function loadAliasNormsByEmpreendimento(client) {
  const { rows: aliasRows } = await client.query(`
    SELECT empreendimento_id, valor_norm
    FROM empreendimento_aliases
    WHERE status = 'mapeado' AND empreendimento_id IS NOT NULL
  `);

  const normsByEmp = new Map();
  for (const row of aliasRows) {
    const set = normsByEmp.get(row.empreendimento_id) ?? new Set();
    set.add(row.valor_norm);
    normsByEmp.set(row.empreendimento_id, set);
  }
  return normsByEmp;
}

async function computeGenesisEmpreendimentoStats(client) {
  const normsByEmp = await loadAliasNormsByEmpreendimento(client);
  const stats = new Map();

  const { rows: totalRows } = await client.query(`SELECT COUNT(*)::int AS total FROM all_leads`);
  const totalAllLeads = totalRows[0]?.total ?? 0;

  if (normsByEmp.size) {
    const { rows: leads } = await client.query(`
      SELECT empreendimento_interesse, profile_completed, cvcrm_is_sold
      FROM all_leads
      WHERE NULLIF(TRIM(empreendimento_interesse), '') IS NOT NULL
    `);

    for (const lead of leads) {
      const matched = matchEmpreendimentoIdsFromRaw(lead.empreendimento_interesse, normsByEmp);
      for (const empId of matched) {
        const bucket = ensureEmpreendimentoStats(stats, empId);
        if (lead.profile_completed) bucket.qualificados += 1;
        if (lead.cvcrm_is_sold) bucket.vendas += 1;
      }
    }

    const leadInterestByIdlead = new Map();
    const { rows: leadsWithCvcrm } = await client.query(`
      SELECT cvcrm_lead_id, empreendimento_interesse
      FROM all_leads
      WHERE NULLIF(TRIM(cvcrm_lead_id), '') IS NOT NULL
    `);
    for (const lead of leadsWithCvcrm) {
      for (const idlead of splitIdleadIds(lead.cvcrm_lead_id)) {
        if (!leadInterestByIdlead.has(idlead)) {
          leadInterestByIdlead.set(idlead, lead.empreendimento_interesse);
        }
      }
    }

    try {
      const { rows: reservas } = await client.query(`
        SELECT idlead, empreendimento, situacao, data_venda, payload->>'data_venda' AS payload_data_venda
        FROM cvcrm_reservas
      `);

      for (const reserva of reservas) {
        const matched = new Set();
        const normFromReserva = normalizeEmpreendimento(reserva.empreendimento);
        for (const empId of matchEmpreendimentoIds(normFromReserva, normsByEmp)) {
          matched.add(empId);
        }

        if (!matched.size) {
          for (const idlead of splitIdleadIds(reserva.idlead)) {
            const interesse = leadInterestByIdlead.get(idlead);
            if (!interesse) continue;
            for (const empId of matchEmpreendimentoIdsFromRaw(interesse, normsByEmp)) {
              matched.add(empId);
            }
          }
        }

        for (const empId of matched) {
          const bucket = ensureEmpreendimentoStats(stats, empId);
          bucket.reservas += 1;
          if (isReservaVendaAndamento(reserva)) bucket.v_andamento += 1;
        }
      }
    } catch (err) {
      if (err?.code !== '42P01') throw err;
    }
  }

  return { stats, totalAllLeads };
}

export async function listEmpreendimentosGenesis(client) {
  await ensureEmpreendimentosSchema(client);
  const { rows } = await client.query(`
    SELECT
      g.id,
      g.nome,
      g.cor,
      g.logo_url,
      g.ativo,
      g.created_at,
      COUNT(a.id) FILTER (WHERE a.status = 'mapeado')::int AS aliases_count,
      COALESCE(SUM(a.ocorrencias) FILTER (WHERE a.status = 'mapeado'), 0)::int AS leads_count
    FROM empreendimentos_genesis g
    LEFT JOIN empreendimento_aliases a ON a.empreendimento_id = g.id
    GROUP BY g.id
    ORDER BY g.nome
  `);

  const { stats, totalAllLeads } = await computeGenesisEmpreendimentoStats(client);
  return rows.map((row) => {
    const bucket = stats.get(row.id) ?? emptyEmpreendimentoStats();
    const leadsCount = Number(row.leads_count) || 0;
    const taxaQualificacao = leadsCount > 0 ? (bucket.qualificados / leadsCount) * 100 : 0;
    const percentualDoTotal = totalAllLeads > 0 ? (leadsCount / totalAllLeads) * 100 : 0;
    return {
      ...row,
      qualificados_count: bucket.qualificados,
      taxa_qualificacao: taxaQualificacao,
      percentual_do_total: percentualDoTotal,
      reservas_count: bucket.reservas,
      v_andamento_count: bucket.v_andamento,
      vendas_count: bucket.vendas,
      total_all_leads: totalAllLeads,
    };
  });
}

export async function getEmpreendimentoGenesis(client, id) {
  await ensureEmpreendimentosSchema(client);
  const empId = Number(id);
  if (!empId) throw Object.assign(new Error('ID inválido.'), { statusCode: 400 });

  const { rows: empRows } = await client.query(
    `SELECT id, nome, cor, logo_url, ativo, created_at FROM empreendimentos_genesis WHERE id = $1`,
    [empId],
  );
  if (!empRows.length) throw Object.assign(new Error('Empreendimento não encontrado.'), { statusCode: 404 });

  const { rows: aliasRows } = await client.query(
    `SELECT id, valor_norm, exemplos_crus, ocorrencias, status
     FROM empreendimento_aliases
     WHERE empreendimento_id = $1 AND status = 'mapeado'
     ORDER BY ocorrencias DESC, valor_norm`,
    [empId],
  );

  const stats = await fetchAliasStats(client);

  return { ...empRows[0], aliases: aliasRows.map(toAliasDto), pending_aliases: stats.a_classificar };
}

async function unassignAliases(client, aliasIds) {
  const ids = normalizeAliasIds(aliasIds);
  if (!ids.length) return 0;
  const { rowCount } = await client.query(
    `UPDATE empreendimento_aliases
     SET empreendimento_id = NULL, status = 'a_classificar', updated_at = now()
     WHERE id = ANY($1::bigint[])`,
    [ids],
  );
  return rowCount ?? 0;
}

export async function saveEmpreendimentoGenesis(client, payload, { id = null } = {}) {
  await ensureEmpreendimentosSchema(client);

  const nome = String(payload?.nome ?? '').trim();
  if (!nome) throw Object.assign(new Error('Nome é obrigatório.'), { statusCode: 400 });

  const cor = normalizeEmpreendimentoColorToken(payload?.cor ?? payload?.color);
  const logoUrl = payload?.logo_url != null ? String(payload.logo_url).trim() || null : null;
  const aliasIds = normalizeAliasIds(payload?.alias_ids);
  const removeAliasIds = normalizeAliasIds(payload?.remove_alias_ids);

  await client.query('BEGIN');
  try {
    let emp;
    if (id) {
      const empId = Number(id);
      const { rows } = await client.query(
        `UPDATE empreendimentos_genesis
         SET nome = $2, cor = $3, logo_url = $4
         WHERE id = $1
         RETURNING id, nome, cor, logo_url, ativo, created_at`,
        [empId, nome, cor, logoUrl],
      );
      if (!rows.length) throw Object.assign(new Error('Empreendimento não encontrado.'), { statusCode: 404 });
      emp = rows[0];
      if (removeAliasIds.length) await unassignAliases(client, removeAliasIds);
      if (aliasIds.length) await assignAliasesToEmpreendimento(client, aliasIds, empId);
    } else {
      const { rows } = await client.query(
        `INSERT INTO empreendimentos_genesis (nome, cor, logo_url)
         VALUES ($1, $2, $3)
         RETURNING id, nome, cor, logo_url, ativo, created_at`,
        [nome, cor, logoUrl],
      );
      emp = rows[0];
      if (aliasIds.length) await assignAliasesToEmpreendimento(client, aliasIds, emp.id);
    }
    await client.query('COMMIT');
    invalidateEmpreendimentoResolver();
    return emp;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

export async function assignAliasesToEmpreendimento(client, aliasIds, empreendimentoId) {
  await ensureEmpreendimentosSchema(client);

  const ids = [...new Set((aliasIds ?? []).map((id) => Number(id)).filter((id) => id > 0))];
  if (!ids.length) throw Object.assign(new Error('alias_ids é obrigatório.'), { statusCode: 400 });

  const empId = Number(empreendimentoId);
  if (!empId) throw Object.assign(new Error('empreendimento_id é obrigatório.'), { statusCode: 400 });

  const { rows: empRows } = await client.query(
    `SELECT id FROM empreendimentos_genesis WHERE id = $1`,
    [empId],
  );
  if (!empRows.length) throw Object.assign(new Error('Empreendimento não encontrado.'), { statusCode: 404 });

  const { rowCount } = await client.query(
    `UPDATE empreendimento_aliases
     SET empreendimento_id = $1, status = 'mapeado', updated_at = now()
     WHERE id = ANY($2::bigint[])`,
    [empId, ids],
  );

  return { updated: rowCount ?? 0 };
}

export async function markAliasesNaoInformado(client, aliasIds) {
  await ensureEmpreendimentosSchema(client);

  const ids = [...new Set((aliasIds ?? []).map((id) => Number(id)).filter((id) => id > 0))];
  if (!ids.length) throw Object.assign(new Error('alias_ids é obrigatório.'), { statusCode: 400 });

  const { rowCount } = await client.query(
    `UPDATE empreendimento_aliases
     SET empreendimento_id = NULL, status = 'nao_informado', updated_at = now()
     WHERE id = ANY($1::bigint[])`,
    [ids],
  );

  return { updated: rowCount ?? 0 };
}

export async function withEmpreendimentosClient(fn) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}
