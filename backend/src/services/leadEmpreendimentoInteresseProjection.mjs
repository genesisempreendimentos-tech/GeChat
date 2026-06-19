/**
 * Rebuild da projeção lead_empreendimento_interesse (person-grain).
 */
import {
  normalizePersonCvcrmLeadId,
  normalizePersonEmail,
  normalizePersonPhone,
} from '../lib/personUnionKeys.mjs';
import { ensureLeadEmpreendimentoInteresseSchema } from '../lib/leadEmpreendimentoInteresseSchema.mjs';
import { collectInteresseNormsForCadastro } from '../lib/leadEmpreendimentoInteresse.mjs';

const INSERT_BATCH_SIZE = 500;

const INTERESSE_SELECT_SQL = `
  id,
  source_table,
  empreendimento_interesse,
  cvcrm_payload,
  email,
  phone,
  cvcrm_lead_id
`.trim();

function buildGeleadsIdLookup(uniqueRows) {
  const emailToId = new Map();
  const phoneToId = new Map();
  const cvcrmToId = new Map();

  for (const row of uniqueRows) {
    const geleadsId = row.geleads_id;
    if (!geleadsId) continue;

    for (const email of row.email ?? []) {
      const key = normalizePersonEmail(email);
      if (key && !emailToId.has(key)) emailToId.set(key, geleadsId);
    }
    for (const phone of row.phone ?? []) {
      const key = normalizePersonPhone(phone);
      if (key && !phoneToId.has(key)) phoneToId.set(key, geleadsId);
    }
    const cvcrmKey = normalizePersonCvcrmLeadId(row.cvcrm_lead_id);
    if (cvcrmKey && !cvcrmToId.has(cvcrmKey)) cvcrmToId.set(cvcrmKey, geleadsId);
  }

  return { emailToId, phoneToId, cvcrmToId };
}

function resolveGeleadsIdForCadastro(row, lookup) {
  const emailKey = normalizePersonEmail(row.email);
  if (emailKey && lookup.emailToId.has(emailKey)) return lookup.emailToId.get(emailKey);

  const phoneKey = normalizePersonPhone(row.phone);
  if (phoneKey && lookup.phoneToId.has(phoneKey)) return lookup.phoneToId.get(phoneKey);

  const cvcrmKey = normalizePersonCvcrmLeadId(row.cvcrm_lead_id);
  if (cvcrmKey && lookup.cvcrmToId.has(cvcrmKey)) return lookup.cvcrmToId.get(cvcrmKey);

  return null;
}

function buildBatchInsertSql(rowCount) {
  const tuples = [];
  for (let i = 0; i < rowCount; i += 1) {
    const base = i * 2;
    tuples.push(`($${base + 1}, $${base + 2})`);
  }
  return `INSERT INTO lead_empreendimento_interesse (geleads_id, empreendimento_norm)
    VALUES ${tuples.join(', ')}
    ON CONFLICT (geleads_id, empreendimento_norm) DO NOTHING`;
}

/** Repovoa lead_empreendimento_interesse a partir de all_leads + all_leads_unique. */
export async function rebuildLeadEmpreendimentoInteresse(client) {
  await ensureLeadEmpreendimentoInteresseSchema(client);

  let uniqueRows = [];
  try {
    const { rows } = await client.query(`
      SELECT geleads_id, email, phone, cvcrm_lead_id
      FROM all_leads_unique
      WHERE geleads_id IS NOT NULL
    `);
    uniqueRows = rows;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  const lookup = buildGeleadsIdLookup(uniqueRows);
  const personNorms = new Map();

  let cadastros = [];
  try {
    const { rows } = await client.query(
      `SELECT ${INTERESSE_SELECT_SQL} FROM all_leads ORDER BY created_at ASC`,
    );
    cadastros = rows;
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }

  let skipped = 0;
  for (const cadastro of cadastros) {
    const geleadsId = resolveGeleadsIdForCadastro(cadastro, lookup);
    if (!geleadsId) {
      skipped += 1;
      continue;
    }

    const norms = collectInteresseNormsForCadastro(cadastro);
    if (!norms.length) continue;

    let set = personNorms.get(geleadsId);
    if (!set) {
      set = new Set();
      personNorms.set(geleadsId, set);
    }
    for (const norm of norms) set.add(norm);
  }

  for (const row of uniqueRows) {
    const geleadsId = row.geleads_id;
    if (!geleadsId || personNorms.has(geleadsId)) continue;
    personNorms.set(geleadsId, new Set(['null']));
  }

  await client.query('TRUNCATE lead_empreendimento_interesse');

  const pairs = [];
  for (const [geleadsId, norms] of personNorms) {
    for (const norm of norms) pairs.push([geleadsId, norm]);
  }

  for (let i = 0; i < pairs.length; i += INSERT_BATCH_SIZE) {
    const chunk = pairs.slice(i, i + INSERT_BATCH_SIZE);
    if (!chunk.length) continue;
    await client.query(buildBatchInsertSql(chunk.length), chunk.flat());
  }

  const totalPairs = pairs.length;
  const totalPersons = personNorms.size;
  console.log(
    `[interesse/projection] ${totalPairs} par(es) ← ${totalPersons} pessoa(s), ${cadastros.length} cadastro(s) (${skipped} sem geleads_id)`,
  );

  return {
    pairs: totalPairs,
    persons: totalPersons,
    cadastros: cadastros.length,
    skipped,
  };
}
