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
  await refreshEmpreendimentoAliasesFromAllLeads(client);

  const interesseMetrics = await aggregateInteresseMetrics(client);

  const { rows } = await client.query(`
    SELECT
      g.id,
      g.nome,
      g.cor,
      g.logo_url,
      g.ativo,
      g.is_trojan,
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
    const empId = Number(row.id);
    const bucket = stats.get(empId) ?? emptyEmpreendimentoStats();
    const leadsCount = Number(row.leads_count) || 0;
    const interessesCount = interesseMetrics.interessesByEmp.get(empId) ?? 0;
    const taxaQualificacao = leadsCount > 0 ? (bucket.qualificados / leadsCount) * 100 : 0;
    const percentualDoTotal = totalAllLeads > 0 ? (leadsCount / totalAllLeads) * 100 : 0;
    return {
      ...row,
      interesses_count: interessesCount,
      pessoas_unicas_count: interesseMetrics.pessoasByEmp.get(empId) ?? 0,
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
    `SELECT id, nome, cor, logo_url, ativo, is_trojan, created_at FROM empreendimentos_genesis WHERE id = $1`,
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
         SET nome = $2, cor = $3, logo_url = $4, is_trojan = $5
         WHERE id = $1
         RETURNING id, nome, cor, logo_url, ativo, is_trojan, created_at`,
        [empId, nome, cor, logoUrl, isTrojan],
      );
      if (!rows.length) throw Object.assign(new Error('Empreendimento não encontrado.'), { statusCode: 404 });
      emp = rows[0];
      if (removeAliasIds.length) await unassignAliases(client, removeAliasIds);
      if (aliasIds.length) await assignAliasesToEmpreendimento(client, aliasIds, empId);
    } else {
      const { rows } = await client.query(
        `INSERT INTO empreendimentos_genesis (nome, cor, logo_url, is_trojan)
         VALUES ($1, $2, $3, $4)
         RETURNING id, nome, cor, logo_url, ativo, is_trojan, created_at`,
        [nome, cor, logoUrl, isTrojan],
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

export async function getEmpreendimentosAnalytics(client) {
  await ensureEmpreendimentosSchema(client);

  const interesseMetrics = await aggregateInteresseMetrics(client);
  const trojanMetrics = await countTrojanInteresseMetrics(client);

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

  const { rows: [cadastroRow] } = await client.query(
    `SELECT COUNT(*)::int AS total FROM all_leads`,
  );
  const totalCadastros = cadastroRow?.total ?? 0;

  const { rows: [personRow] } = await client.query(
    `SELECT COUNT(*)::int AS total FROM all_leads_unique`,
  );
  const totalPessoas = personRow?.total ?? 0;

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
