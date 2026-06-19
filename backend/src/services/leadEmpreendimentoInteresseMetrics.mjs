/**
 * Métricas de interesse a partir da projeção person-grain.
 */
import {
  loadEmpreendimentoResolver,
  resolveEmpreendimentoPartGenesis,
} from './empreendimentoResolver.mjs';
import { ensureLeadEmpreendimentoInteresseSchema } from '../lib/leadEmpreendimentoInteresseSchema.mjs';

async function loadNormToEmpId(client) {
  const { rows } = await client.query(`
    SELECT a.empreendimento_id, a.valor_norm
    FROM empreendimento_aliases a
    WHERE a.status = 'mapeado' AND a.empreendimento_id IS NOT NULL
  `);
  const normToEmpId = new Map();
  for (const row of rows) {
    normToEmpId.set(row.valor_norm, Number(row.empreendimento_id));
  }
  return normToEmpId;
}

async function loadTrojanEmpIds(client) {
  const { rows } = await client.query(`
    SELECT id FROM empreendimentos_genesis WHERE is_trojan = true
  `);
  return new Set(rows.map((row) => Number(row.id)));
}

function buildPersonMappedEmpIds(projectionRows, normToEmpId, geleadsIdFilter) {
  const personEmpIds = new Map();
  for (const row of projectionRows) {
    if (geleadsIdFilter && !geleadsIdFilter.has(row.geleads_id)) continue;
    const empId = resolveNormToEmpId(row.empreendimento_norm, normToEmpId);
    if (!empId) continue;
    const set = personEmpIds.get(row.geleads_id) ?? new Set();
    set.add(empId);
    personEmpIds.set(row.geleads_id, set);
  }
  return personEmpIds;
}

/**
 * Pessoas com interesse mapeado SOMENTE em empreendimentos trojan vs interesse genuíno.
 */
export function classifyTrojanInteresse(personEmpIds, trojanEmpIds) {
  const semInteresse = new Set();
  const comInteresseGenuino = new Set();

  for (const [geleadsId, empIds] of personEmpIds) {
    if (!empIds.size) continue;
    const onlyTrojan = [...empIds].every((id) => trojanEmpIds.has(id));
    if (onlyTrojan && trojanEmpIds.size > 0) semInteresse.add(geleadsId);
    else if ([...empIds].some((id) => !trojanEmpIds.has(id))) comInteresseGenuino.add(geleadsId);
  }

  return { semInteresse, comInteresseGenuino };
}

/** Soma pessoas_unicas por faixa Empreendimentos (não-troia) vs Tróia — permite sobreposição entre fatias. */
export function sumPessoasEmpreendimentosVsTroia(pessoasByEmp, trojanEmpIds) {
  let pessoasEmpreendimentos = 0;
  let pessoasTroia = 0;
  for (const [empId, pessoas] of pessoasByEmp) {
    if (trojanEmpIds.has(empId)) pessoasTroia += pessoas;
    else pessoasEmpreendimentos += pessoas;
  }
  return { pessoasEmpreendimentos, pessoasTroia };
}

export async function countTrojanInteresseMetrics(client, { geleadsIdFilter = null } = {}) {
  await ensureLeadEmpreendimentoInteresseSchema(client);
  await loadEmpreendimentoResolver(client);

  let projectionRows = [];
  try {
    const { rows } = await client.query(`
      SELECT geleads_id, empreendimento_norm
      FROM lead_empreendimento_interesse
    `);
    projectionRows = rows;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  const normToEmpId = await loadNormToEmpId(client);
  const trojanEmpIds = await loadTrojanEmpIds(client);
  const personEmpIds = buildPersonMappedEmpIds(projectionRows, normToEmpId, geleadsIdFilter);
  return classifyTrojanInteresse(personEmpIds, trojanEmpIds);
}

function resolveNormToEmpId(valorNorm, normToEmpId) {
  if (normToEmpId.has(valorNorm)) return normToEmpId.get(valorNorm);
  const genesisName = resolveEmpreendimentoPartGenesis(valorNorm);
  if (!genesisName) return null;
  for (const [norm, empId] of normToEmpId) {
    if (resolveEmpreendimentoPartGenesis(norm) === genesisName) return empId;
  }
  return null;
}

/**
 * Agrega pessoas_unicas e total_interesses por empreendimento Genesis (canônico).
 * @param {Set<string>|null} geleadsIdFilter — quando informado, restringe às pessoas filtradas
 */
export async function aggregateInteresseMetrics(client, { geleadsIdFilter = null } = {}) {
  await ensureLeadEmpreendimentoInteresseSchema(client);
  await loadEmpreendimentoResolver(client);

  let projectionRows = [];
  try {
    const { rows } = await client.query(`
      SELECT geleads_id, empreendimento_norm
      FROM lead_empreendimento_interesse
    `);
    projectionRows = rows;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  const normToEmpId = await loadNormToEmpId(client);

  const pessoasByEmp = new Map();
  const interessesByEmp = new Map();
  const pessoasComInteresse = new Set();
  const pessoasComQualquerInteresse = new Set();
  const personCanonicalPairs = new Set();

  for (const row of projectionRows) {
    if (geleadsIdFilter && !geleadsIdFilter.has(row.geleads_id)) continue;

    pessoasComQualquerInteresse.add(row.geleads_id);

    const empId = resolveNormToEmpId(row.empreendimento_norm, normToEmpId);
    if (!empId) continue;

    pessoasComInteresse.add(row.geleads_id);
    interessesByEmp.set(empId, (interessesByEmp.get(empId) ?? 0) + 1);

    const pairKey = `${row.geleads_id}:${empId}`;
    if (!personCanonicalPairs.has(pairKey)) {
      personCanonicalPairs.add(pairKey);
      pessoasByEmp.set(empId, (pessoasByEmp.get(empId) ?? 0) + 1);
    }
  }

  return {
    pessoasByEmp,
    interessesByEmp,
    pessoasComInteresse,
    pessoasComQualquerInteresse,
    totalInteresses: [...interessesByEmp.values()].reduce((s, n) => s + n, 0),
  };
}

/** Contagem de pessoas com ≥1 interesse mapeado e total de pares na projeção filtrada. */
export async function countInteresseCoverage(client, geleadsIdFilter = null) {
  const metrics = await aggregateInteresseMetrics(client, {
    geleadsIdFilter: geleadsIdFilter ?? null,
  });
  return {
    comInteresse: metrics.pessoasComInteresse.size,
    totalInteresses: metrics.totalInteresses,
    pessoasByEmp: metrics.pessoasByEmp,
    interessesByEmp: metrics.interessesByEmp,
  };
}

/**
 * Distribuição por empreendimento canônico (nome Genesis) para overview.
 * @returns {Map<string, { pessoas: number, interesses: number }>}
 */
export async function aggregateInteresseByGenesisName(client, { geleadsIdFilter = null } = {}) {
  await ensureLeadEmpreendimentoInteresseSchema(client);

  const { rows: genesisRows } = await client.query(`
    SELECT id, nome FROM empreendimentos_genesis ORDER BY nome
  `);
  const nameById = new Map(genesisRows.map((r) => [Number(r.id), r.nome]));

  const metrics = await aggregateInteresseMetrics(client, { geleadsIdFilter });
  const byName = new Map();

  for (const [empId, pessoas] of metrics.pessoasByEmp) {
    const nome = nameById.get(empId);
    if (!nome) continue;
    byName.set(nome, {
      pessoas,
      interesses: metrics.interessesByEmp.get(empId) ?? 0,
    });
  }

  return byName;
}
