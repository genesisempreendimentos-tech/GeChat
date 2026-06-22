import pg from 'pg';
import { getNeonLeadsUrl } from '../lib/neonLeads.mjs';
import { ensureEmpreendimentosSchema } from '../lib/empreendimentosSchema.mjs';
import { normalizeEmpreendimentoColorToken } from '../lib/empreendimentoColor.mjs';
import {
  extractEmpreendimentoParts,
  normalizeEmpreendimento,
} from '../lib/normalizeEmpreendimento.mjs';
import { invalidateEmpreendimentoResolver } from './empreendimentoResolver.mjs';
import { aggregateInteresseMetrics, countTrojanInteresseMetrics, sumPessoasEmpreendimentosVsTroia } from './leadEmpreendimentoInteresseMetrics.mjs';
import { refreshEmpreendimentoAliasesFromAllLeads } from './refreshEmpreendimentoAliasesFromAllLeads.mjs';

const SIMILARITY_THRESHOLD = 0.45;

/** @typedef {{ from: string|null, to: string|null }} EmpreendimentosDateFilter */

export function parseEmpreendimentosDateFilter(query = {}) {
  const from = String(query.from ?? query.created_de ?? '').trim();
  const to = String(query.to ?? query.created_ate ?? '').trim();
  if (!from && !to) return null;
  return { from: from || null, to: to || null };
}

function buildRangeWhere(dateFilter, columnExpr, params, baseParts = ['1=1']) {
  const parts = [...baseParts];
  if (!dateFilter) return { whereSql: parts.join(' AND '), params };
  if (dateFilter.from) {
    params.push(dateFilter.from);
    parts.push(`${columnExpr} >= $${params.length}::date`);
  }
  if (dateFilter.to) {
    params.push(dateFilter.to);
    parts.push(`${columnExpr} < ($${params.length}::date + interval '1 day')`);
  }
  return { whereSql: parts.join(' AND '), params };
}

/** Pessoas (geleads_id) com ≥1 cadastro em all_leads no período. */
async function loadGeleadsIdsFromLeadsInRange(client, dateFilter) {
  if (!dateFilter) return null;
  const params = [];
  const { whereSql } = buildRangeWhere(dateFilter, 'al.created_at', params);
  const ids = new Set();

  const { rows: cvRows } = await client.query(
    `SELECT DISTINCT u.geleads_id
     FROM all_leads al
     INNER JOIN all_leads_unique u
       ON al.cvcrm_lead_id IS NOT NULL
      AND u.cvcrm_lead_id IS NOT NULL
      AND al.cvcrm_lead_id = u.cvcrm_lead_id
     WHERE ${whereSql}
       AND u.geleads_id IS NOT NULL`,
    params,
  );
  for (const row of cvRows) ids.add(row.geleads_id);

  const emailParams = [...params];
  const { rows: emailRows } = await client.query(
    `SELECT DISTINCT u.geleads_id
     FROM all_leads al
     INNER JOIN all_leads_unique u
       ON al.email IS NOT NULL
      AND al.email = ANY(u.email)
     WHERE ${whereSql}
       AND u.geleads_id IS NOT NULL
       AND (al.cvcrm_lead_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM all_leads_unique u2
         WHERE u2.cvcrm_lead_id IS NOT NULL
           AND al.cvcrm_lead_id = u2.cvcrm_lead_id
           AND u2.geleads_id IS NOT NULL
       ))`,
    emailParams,
  );
  for (const row of emailRows) ids.add(row.geleads_id);

  const phoneParams = [...params];
  const { rows: phoneRows } = await client.query(
    `SELECT DISTINCT u.geleads_id
     FROM all_leads al
     INNER JOIN all_leads_unique u
       ON al.phone IS NOT NULL
      AND al.phone = ANY(u.phone)
     WHERE ${whereSql}
       AND u.geleads_id IS NOT NULL
       AND al.cvcrm_lead_id IS NULL
       AND (al.email IS NULL OR NOT EXISTS (
         SELECT 1 FROM all_leads_unique u3
         WHERE al.email = ANY(u3.email) AND u3.geleads_id IS NOT NULL
       ))`,
    phoneParams,
  );
  for (const row of phoneRows) ids.add(row.geleads_id);

  return ids;
}

async function countCadastrosByEmpInRange(client, normsByEmp, dateFilter) {
  const counts = new Map();
  if (!dateFilter || !normsByEmp.size) return counts;

  const params = [];
  const { whereSql } = buildRangeWhere(dateFilter, 'al.created_at', params, [
    `NULLIF(TRIM(al.empreendimento_interesse), '') IS NOT NULL`,
  ]);
  const { rows } = await client.query(
    `SELECT al.empreendimento_interesse FROM all_leads al WHERE ${whereSql}`,
    params,
  );

  for (const lead of rows) {
    for (const empId of matchEmpreendimentoIdsFromRaw(lead.empreendimento_interesse, normsByEmp)) {
      counts.set(empId, (counts.get(empId) ?? 0) + 1);
    }
  }
  return counts;
}

async function countVendasByEmpInRange(client, normsByEmp, dateFilter) {
  const counts = new Map();
  if (!dateFilter || !normsByEmp.size) return counts;

  const params = [];
  const parts = ['cr.data_venda IS NOT NULL', 'al.geleads_id IS NOT NULL'];
  if (dateFilter.from) {
    params.push(dateFilter.from);
    parts.push(`cr.data_venda >= $${params.length}::date`);
  }
  if (dateFilter.to) {
    params.push(dateFilter.to);
    parts.push(`cr.data_venda < ($${params.length}::date + interval '1 day')`);
  }

  try {
    const { rows } = await client.query(
      `SELECT DISTINCT al.geleads_id, cr.empreendimento
       FROM cvcrm_reservas cr
       INNER JOIN all_leads_unique al ON al.cvcrm_lead_id::text = cr.idlead::text
       WHERE ${parts.join(' AND ')}`,
      params,
    );

    const geleadsByEmp = new Map();
    for (const row of rows) {
      const matched = new Set();
      const normFromReserva = normalizeEmpreendimento(row.empreendimento);
      for (const empId of matchEmpreendimentoIds(normFromReserva, normsByEmp)) {
        matched.add(empId);
      }
      for (const empId of matchEmpreendimentoIdsFromRaw(row.empreendimento, normsByEmp)) {
        matched.add(empId);
      }
      for (const empId of matched) {
        const set = geleadsByEmp.get(empId) ?? new Set();
        set.add(row.geleads_id);
        geleadsByEmp.set(empId, set);
      }
    }
    for (const [empId, geleadsSet] of geleadsByEmp) {
      counts.set(empId, geleadsSet.size);
    }
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }
  return counts;
}

function matchReservaToEmpIds(reserva, normsByEmp, leadInterestByIdlead) {
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
  return matched;
}

async function loadLeadInterestByIdlead(client, dateFilter) {
  const params = [];
  const base = [`NULLIF(TRIM(al.cvcrm_lead_id), '') IS NOT NULL`];
  const { whereSql } = dateFilter
    ? buildRangeWhere(dateFilter, 'al.created_at', params, base)
    : { whereSql: base.join(' AND '), params };
  const { rows } = await client.query(
    `SELECT cvcrm_lead_id, empreendimento_interesse
     FROM all_leads al
     WHERE ${whereSql}`,
    params,
  );
  const map = new Map();
  for (const lead of rows) {
    for (const idlead of splitIdleadIds(lead.cvcrm_lead_id)) {
      if (!map.has(idlead)) map.set(idlead, lead.empreendimento_interesse);
    }
  }
  return map;
}

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

/** Unidades cadastradas, restantes (unidades − vendas) e conversão (vendas / leads × 100). */
function computeEmpreendimentoUnitMetrics({ unidades, vendas, leads }) {
  const unidadesCount = Number(unidades) || 0;
  const vendasCount = Number(vendas) || 0;
  const leadsCount = Number(leads) || 0;
  return {
    unidades_count: unidadesCount,
    restantes_count: unidadesCount - vendasCount,
    conversao: leadsCount > 0 ? (vendasCount / leadsCount) * 100 : 0,
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
       WHERE status IN ('a_classificar', 'nao_informado')
         AND ocorrencias > 0
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
  await refreshEmpreendimentoAliasesFromAllLeads(client, { invalidateResolver: false });

  let whereSql = 'ocorrencias > 0';
  const params = [];
  if (statusFilter === 'a_classificar') {
    whereSql = `status IN ('a_classificar', 'nao_informado') AND ocorrencias > 0`;
  } else if (statusFilter) {
    params.push(statusFilter);
    whereSql = `status = $${params.length} AND ocorrencias > 0`;
  }

  const { rows } = await client.query(
    `SELECT id, valor_norm, exemplos_crus, ocorrencias, empreendimento_id, status
     FROM empreendimento_aliases
     WHERE ${whereSql}
     ORDER BY ocorrencias DESC, valor_norm`,
    params,
  );

  const selectable = rows.filter(
    (row) => row.status === 'a_classificar' || row.status === 'nao_informado',
  );
  const others = rows.filter(
    (row) => row.status !== 'a_classificar' && row.status !== 'nao_informado',
  );

  const suggested = statusFilter === 'mapeado' || statusFilter === 'nao_informado'
    ? []
    : await clusterAClassificar(client, selectable);

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

export async function listAllAliases(client) {
  await ensureEmpreendimentosSchema(client);
  await refreshEmpreendimentoAliasesFromAllLeads(client, { invalidateResolver: false });

  const { rows } = await client.query(`
    SELECT
      a.id,
      a.valor_norm,
      a.exemplos_crus,
      a.ocorrencias,
      a.empreendimento_id,
      a.status,
      g.nome AS empreendimento_nome
    FROM empreendimento_aliases a
    LEFT JOIN empreendimentos_genesis g ON g.id = a.empreendimento_id
    WHERE a.ocorrencias > 0
    ORDER BY a.ocorrencias DESC, a.valor_norm
  `);

  const stats = await fetchAliasStats(client);

  return {
    aliases: rows.map((row) => ({
      ...toAliasDto(row),
      empreendimento_nome: row.empreendimento_nome ?? null,
    })),
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
    const empId = Number(row.empreendimento_id);
    const set = normsByEmp.get(empId) ?? new Set();
    set.add(row.valor_norm);
    normsByEmp.set(empId, set);
  }
  return normsByEmp;
}

async function loadIdleadToGeleadsId(client) {
  const { rows } = await client.query(`
    SELECT cvcrm_lead_id, geleads_id
    FROM all_leads_unique
    WHERE cvcrm_lead_id IS NOT NULL AND geleads_id IS NOT NULL
  `);
  const map = new Map();
  for (const row of rows) {
    for (const idlead of splitIdleadIds(row.cvcrm_lead_id)) {
      if (!map.has(idlead)) map.set(idlead, row.geleads_id);
    }
  }
  return map;
}

async function computeGenesisEmpreendimentoStats(client, dateFilter = null) {
  const normsByEmp = await loadAliasNormsByEmpreendimento(client);
  const stats = new Map();

  const totalParams = [];
  const { whereSql: totalWhere } = buildRangeWhere(dateFilter, 'al.created_at', totalParams);
  const { rows: totalRows } = await client.query(
    `SELECT COUNT(*)::int AS total FROM all_leads al WHERE ${totalWhere}`,
    totalParams,
  );
  const totalAllLeads = totalRows[0]?.total ?? 0;

  if (!normsByEmp.size) return { stats, totalAllLeads };

  const leadParams = [];
  const { whereSql: leadWhere } = buildRangeWhere(dateFilter, 'al.created_at', leadParams, [
    `NULLIF(TRIM(al.empreendimento_interesse), '') IS NOT NULL`,
  ]);
  const { rows: leads } = await client.query(
    `SELECT empreendimento_interesse, email, phone, relationship_status, monthly_investment,
            current_city, birth_date, profile_type, profile_completed, cvcrm_is_sold
     FROM all_leads al
     WHERE ${leadWhere}`,
    leadParams,
  );

  for (const lead of leads) {
    const matched = matchEmpreendimentoIdsFromRaw(lead.empreendimento_interesse, normsByEmp);
    for (const empId of matched) {
      const bucket = ensureEmpreendimentoStats(stats, empId);
      if (dateFilter) {
        if (isLeadQualificadoAltaMedia(lead)) bucket.qualificados += 1;
      } else {
        if (lead.profile_completed) bucket.qualificados += 1;
        if (lead.cvcrm_is_sold) bucket.vendas += 1;
      }
    }
  }

  const leadInterestByIdlead = await loadLeadInterestByIdlead(client, null);

  try {
    const { rows: reservas } = await client.query(`
      SELECT idreserva, idlead, empreendimento, situacao, data_venda,
             payload->>'data_venda' AS payload_data_venda,
             data_contrato, data_aprovacao, last_synced_at
      FROM cvcrm_reservas
    `);

    const vendasGeleadsByEmp = dateFilter ? new Map() : null;
    const idleadToGeleads = dateFilter ? await loadIdleadToGeleadsId(client) : null;

    for (const reserva of reservas) {
      const matched = matchReservaToEmpIds(reserva, normsByEmp, leadInterestByIdlead);

      if (dateFilter) {
        if (reservaCreatedInRange(reserva, dateFilter)) {
          for (const empId of matched) {
            ensureEmpreendimentoStats(stats, empId).reservas += 1;
          }
        }
        if (reservaHasSaleInRange(reserva, dateFilter)) {
          for (const empId of matched) {
            const geleadsKey = resolveReservaGeleadsKey(reserva, idleadToGeleads);
            if (!geleadsKey) continue;
            const set = vendasGeleadsByEmp.get(empId) ?? new Set();
            set.add(geleadsKey);
            vendasGeleadsByEmp.set(empId, set);
          }
        }
        continue;
      }

      for (const empId of matched) {
        const bucket = ensureEmpreendimentoStats(stats, empId);
        bucket.reservas += 1;
        if (isReservaVendaAndamento(reserva)) bucket.v_andamento += 1;
      }
    }

    if (dateFilter && vendasGeleadsByEmp) {
      for (const [empId, geleadsSet] of vendasGeleadsByEmp) {
        ensureEmpreendimentoStats(stats, empId).vendas = geleadsSet.size;
      }
    }
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  return { stats, totalAllLeads };
}

function resolveReservaGeleadsKey(reserva, idleadToGeleads) {
  for (const idlead of splitIdleadIds(reserva.idlead)) {
    const geleadsId = idleadToGeleads?.get(idlead);
    if (geleadsId) return geleadsId;
  }
  const fallbackIdlead = splitIdleadIds(reserva.idlead)[0];
  return fallbackIdlead || null;
}

export async function listEmpreendimentosGenesis(client, dateFilter = null) {
  await ensureEmpreendimentosSchema(client);
  await refreshEmpreendimentoAliasesFromAllLeads(client);

  const geleadsIdFilter = await loadGeleadsIdsFromLeadsInRange(client, dateFilter);
  const interesseMetrics = await aggregateInteresseMetrics(client, { geleadsIdFilter });
  const normsByEmp = await loadAliasNormsByEmpreendimento(client);
  const leadsInRange = dateFilter ? await countCadastrosByEmpInRange(client, normsByEmp, dateFilter) : null;

  const { rows } = await client.query(`
    SELECT
      g.id,
      g.nome,
      g.cor,
      g.logo_url,
      g.ativo,
      g.is_trojan,
      g.created_at,
      g.unidades,
      COUNT(a.id) FILTER (WHERE a.status = 'mapeado')::int AS aliases_count,
      COALESCE(SUM(a.ocorrencias) FILTER (WHERE a.status = 'mapeado'), 0)::int AS leads_count
    FROM empreendimentos_genesis g
    LEFT JOIN empreendimento_aliases a ON a.empreendimento_id = g.id
    GROUP BY g.id
    ORDER BY g.nome
  `);

  const { stats, totalAllLeads } = await computeGenesisEmpreendimentoStats(client, dateFilter);
  return rows.map((row) => {
    const empId = Number(row.id);
    const bucket = stats.get(empId) ?? emptyEmpreendimentoStats();
    const leadsCount = leadsInRange
      ? (leadsInRange.get(empId) ?? 0)
      : Number(row.leads_count) || 0;
    const interessesCount = interesseMetrics.interessesByEmp.get(empId) ?? 0;
    const taxaQualificacao = leadsCount > 0 ? (bucket.qualificados / leadsCount) * 100 : 0;
    const percentualDoTotal = totalAllLeads > 0 ? (leadsCount / totalAllLeads) * 100 : 0;
    const unitMetrics = computeEmpreendimentoUnitMetrics({
      unidades: row.unidades,
      vendas: bucket.vendas,
      leads: leadsCount,
    });
    return {
      ...row,
      interesses_count: interessesCount,
      pessoas_unicas_count: interesseMetrics.pessoasByEmp.get(empId) ?? 0,
      ...unitMetrics,
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
  await refreshEmpreendimentoAliasesFromAllLeads(client, { invalidateResolver: false });
  const empId = Number(id);
  if (!empId) throw Object.assign(new Error('ID inválido.'), { statusCode: 400 });

  const { rows: empRows } = await client.query(
    `SELECT id, nome, cor, logo_url, ativo, is_trojan, unidades, created_at FROM empreendimentos_genesis WHERE id = $1`,
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

  return { ...empRows[0], unidades_count: Number(empRows[0].unidades) || 0, aliases: aliasRows.map(toAliasDto), pending_aliases: stats.a_classificar };
}

async function assertEmpreendimentoColorAvailable(client, cor, excludeId = null) {
  const { rows } = await client.query(`SELECT id, nome, cor FROM empreendimentos_genesis`);
  for (const row of rows) {
    if (excludeId != null && Number(row.id) === Number(excludeId)) continue;
    if (normalizeEmpreendimentoColorToken(row.cor) === cor) {
      throw Object.assign(new Error(`A cor já está em uso por "${row.nome}".`), { statusCode: 409 });
    }
  }
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
  const isTrojan = Boolean(payload?.is_trojan);
  const unidades = Math.max(0, Math.floor(Number(payload?.unidades ?? payload?.unidades_count ?? 0) || 0));
  const aliasIds = normalizeAliasIds(payload?.alias_ids);
  const removeAliasIds = normalizeAliasIds(payload?.remove_alias_ids);

  await assertEmpreendimentoColorAvailable(client, cor, id);

  await client.query('BEGIN');
  try {
    let emp;
    if (id) {
      const empId = Number(id);
      const { rows } = await client.query(
        `UPDATE empreendimentos_genesis
         SET nome = $2, cor = $3, logo_url = $4, is_trojan = $5, unidades = $6
         WHERE id = $1
         RETURNING id, nome, cor, logo_url, ativo, is_trojan, unidades, created_at`,
        [empId, nome, cor, logoUrl, isTrojan, unidades],
      );
      if (!rows.length) throw Object.assign(new Error('Empreendimento não encontrado.'), { statusCode: 404 });
      emp = rows[0];
      if (removeAliasIds.length) await unassignAliases(client, removeAliasIds);
      if (aliasIds.length) await assignAliasesToEmpreendimento(client, aliasIds, empId);
    } else {
      const { rows } = await client.query(
        `INSERT INTO empreendimentos_genesis (nome, cor, logo_url, is_trojan, unidades)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, cor, logo_url, ativo, is_trojan, unidades, created_at`,
        [nome, cor, logoUrl, isTrojan, unidades],
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

export async function getEmpreendimentosAnalytics(client, dateFilter = null) {
  await ensureEmpreendimentosSchema(client);

  const geleadsIdFilter = await loadGeleadsIdsFromLeadsInRange(client, dateFilter);
  const interesseMetrics = await aggregateInteresseMetrics(client, { geleadsIdFilter });
  const trojanMetrics = await countTrojanInteresseMetrics(client, { geleadsIdFilter });

  const { rows: genesisRows } = await client.query(`
    SELECT id, nome, cor, ativo, is_trojan
    FROM empreendimentos_genesis
    ORDER BY nome
  `);
  const genesisById = new Map(genesisRows.map((row) => [Number(row.id), row]));
  const trojanEmpIds = new Set(
    genesisRows.filter((row) => row.is_trojan).map((row) => Number(row.id)),
  );
  const { pessoasEmpreendimentos, pessoasTroia } = sumPessoasEmpreendimentosVsTroia(
    interesseMetrics.pessoasByEmp,
    trojanEmpIds,
  );
  const interesseEmpTroiaTotal = pessoasEmpreendimentos + pessoasTroia;

  const cadParams = [];
  const { whereSql: cadWhere } = buildRangeWhere(dateFilter, 'al.created_at', cadParams);
  const { rows: [cadastroRow] } = await client.query(
    `SELECT COUNT(*)::int AS total FROM all_leads al WHERE ${cadWhere}`,
    cadParams,
  );
  const totalCadastros = cadastroRow?.total ?? 0;

  let totalPessoas;
  if (dateFilter) {
    const geleadsInRange = await loadGeleadsIdsFromLeadsInRange(client, dateFilter);
    totalPessoas = geleadsInRange?.size ?? 0;
  } else {
    const { rows: [personRow] } = await client.query(
      `SELECT COUNT(*)::int AS total FROM all_leads_unique WHERE geleads_id IS NOT NULL`,
    );
    totalPessoas = personRow?.total ?? 0;
  }

  const comInteresseGenuino = trojanMetrics.comInteresseGenuino.size;
  const semInteresseTrojanOnly = trojanMetrics.semInteresse.size;
  const semEmpreendimento = Math.max(0, totalPessoas - comInteresseGenuino - semInteresseTrojanOnly);
  const totalInteresses = interesseMetrics.totalInteresses;

  const { rows: aliasStatsRows } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'mapeado')::int AS mapeados,
      COUNT(*) FILTER (WHERE status = 'a_classificar')::int AS a_classificar
    FROM empreendimento_aliases
  `);
  const aliasesMapeados = aliasStatsRows[0]?.mapeados ?? 0;
  const aliasesAClassificar = aliasStatsRows[0]?.a_classificar ?? 0;

  const pct = (n, total) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);

  const porEmpreendimento = [...interesseMetrics.pessoasByEmp.entries()]
    .map(([empId, pessoasUnicas]) => {
      const meta = genesisById.get(empId);
      const totalInteressesEmp = interesseMetrics.interessesByEmp.get(empId) ?? 0;
      return {
        id: empId,
        nome: meta?.nome ?? `Empreendimento #${empId}`,
        cor: meta?.cor ?? null,
        pessoas_unicas: pessoasUnicas,
        total_interesses: totalInteressesEmp,
        count: pessoasUnicas,
        percent: 0,
      };
    })
    .filter((row) => row.pessoas_unicas > 0)
    .sort((a, b) => b.pessoas_unicas - a.pessoas_unicas);

  const totalPessoasComEmp = porEmpreendimento.reduce((sum, row) => sum + row.pessoas_unicas, 0);
  for (const row of porEmpreendimento) {
    row.percent = pct(row.pessoas_unicas, totalPessoasComEmp);
  }

  const empreendimentosAtivos = genesisRows.filter((row) => row.ativo).length;

  return {
    bignumbers: {
      total_pessoas: { count: totalPessoas, percent: 100 },
      total_cadastros: { count: totalCadastros, percent: 100 },
      com_empreendimento: {
        count: pessoasEmpreendimentos,
        percent: pct(pessoasEmpreendimentos, interesseEmpTroiaTotal || 1),
      },
      sem_interesse: {
        count: pessoasTroia,
        percent: pct(pessoasTroia, interesseEmpTroiaTotal || 1),
      },
      sem_empreendimento: {
        count: semEmpreendimento,
        percent: pct(semEmpreendimento, totalPessoas),
      },
      total_interesses: {
        count: totalInteresses,
        percent: pct(totalInteresses, totalInteresses || 1),
      },
      empreendimentos_ativos: {
        count: empreendimentosAtivos,
        percent: pct(empreendimentosAtivos, genesisRows.length || 1),
      },
      aliases_mapeados: {
        count: aliasesMapeados,
        percent: pct(
          aliasesMapeados,
          aliasesMapeados + aliasesAClassificar || 1,
        ),
      },
    },
    interesse_coverage: {
      pessoas_empreendimentos: pessoasEmpreendimentos,
      pessoas_troia: pessoasTroia,
      total: interesseEmpTroiaTotal,
      com_interesse_genuino: comInteresseGenuino,
      sem_interesse_trojan_only: semInteresseTrojanOnly,
      sem_empreendimento: semEmpreendimento,
      total_pessoas: totalPessoas,
      total_interesses: totalInteresses,
    },
    por_empreendimento: porEmpreendimento,
  };
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
