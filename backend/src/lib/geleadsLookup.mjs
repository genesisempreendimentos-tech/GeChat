import {
  normalizePersonCvcrmLeadId,
  normalizePersonEmail,
  normalizePersonPhone,
} from './personUnionKeys.mjs';

function toSafeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function indexCvcrmLeadIds(cvcrmRaw, geleadsId, cvcrmMap) {
  const raw = toSafeString(cvcrmRaw);
  if (!raw) return;
  for (const part of raw.split(',')) {
    const id = normalizePersonCvcrmLeadId(part);
    if (id) cvcrmMap.set(id, geleadsId);
  }
}

/** Mapas cvcrm/email/phone → geleads_id atual (all_leads_unique). */
export async function buildGeleadsLookup(client) {
  const cvcrmMap = new Map();
  const emailMap = new Map();
  const phoneMap = new Map();
  const activeIds = new Set();

  const { rows: uniqueRows } = await client.query(`
    SELECT geleads_id, cvcrm_lead_id, email, phone
    FROM all_leads_unique
    WHERE geleads_id IS NOT NULL
  `);

  for (const row of uniqueRows) {
    const gid = toSafeString(row.geleads_id);
    if (!gid) continue;
    activeIds.add(gid);
    indexCvcrmLeadIds(row.cvcrm_lead_id, gid, cvcrmMap);
    for (const e of row.email ?? []) {
      const norm = normalizePersonEmail(e);
      if (norm) emailMap.set(norm, gid);
    }
    for (const p of row.phone ?? []) {
      const norm = normalizePersonPhone(p);
      if (norm) phoneMap.set(norm, gid);
    }
  }

  return { cvcrmMap, emailMap, phoneMap, activeIds };
}

export function resolveGeleadsIdFromLeadRow(row, lookup) {
  const cvcrm = normalizePersonCvcrmLeadId(row.cvcrm_lead_id);
  if (cvcrm && lookup.cvcrmMap.has(cvcrm)) return lookup.cvcrmMap.get(cvcrm);

  const email = normalizePersonEmail(row.email);
  if (email && lookup.emailMap.has(email)) return lookup.emailMap.get(email);

  const phone = normalizePersonPhone(row.phone);
  if (phone && lookup.phoneMap.has(phone)) return lookup.phoneMap.get(phone);

  return null;
}

export function resolveGeleadsIdFromCvcrmLeadId(cvcrmLeadId, lookup) {
  const id = normalizePersonCvcrmLeadId(cvcrmLeadId);
  if (!id) return null;
  return lookup.cvcrmMap.get(id) ?? null;
}

/** Resolve pelo cvcrm_lead_id do evento ou pelo signup em payload (lead_criado). */
export function resolveGeleadsIdForHistoricoRow(row, lookup, leadRowByCadastro = new Map()) {
  if (row.cvcrm_lead_id != null) {
    const fromCvcrm = resolveGeleadsIdFromCvcrmLeadId(row.cvcrm_lead_id, lookup);
    if (fromCvcrm) return fromCvcrm;
  }

  const payload = row.payload ?? {};
  const sourceTable = toSafeString(payload.source_table);
  const cadastroId = toSafeString(payload.cadastro_id);
  if (sourceTable && cadastroId) {
    const leadRow = leadRowByCadastro.get(`${sourceTable}|${cadastroId}`);
    if (leadRow) {
      const fromSignup = resolveGeleadsIdFromLeadRow(leadRow, lookup);
      if (fromSignup) return fromSignup;
    }
  }

  const stored = toSafeString(row.geleads_id);
  if (stored && lookup.activeIds.has(stored)) return stored;

  return null;
}

export async function loadLeadRowsForHistorico(client, historicoRows) {
  const keys = new Set();
  for (const row of historicoRows) {
    if (row.cvcrm_lead_id != null) continue;
    const payload = row.payload ?? {};
    const sourceTable = toSafeString(payload.source_table);
    const cadastroId = toSafeString(payload.cadastro_id);
    if (sourceTable && cadastroId) keys.add(`${sourceTable}|${cadastroId}`);
  }
  if (keys.size === 0) return new Map();

  const tuples = [...keys].map((k) => {
    const [source_table, id] = k.split('|');
    return { source_table, id };
  });

  const params = [];
  const conditions = tuples.map((t, i) => {
    const base = i * 2 + 1;
    params.push(t.source_table, t.id);
    return `(source_table = $${base} AND id::text = $${base + 1})`;
  });

  const { rows } = await client.query(
    `SELECT id, source_table, email, phone, cvcrm_lead_id
     FROM all_leads
     WHERE ${conditions.join(' OR ')}`,
    params,
  );

  const map = new Map();
  for (const row of rows) {
    map.set(`${row.source_table}|${String(row.id)}`, row);
  }
  return map;
}

/** Substitui geleads_id stale pelo valor atual de all_leads_unique. */
export async function enrichHistoricoGeleadsIds(client, historicoRows) {
  if (!historicoRows?.length) return historicoRows;
  const lookup = await buildGeleadsLookup(client);
  const leadRowByCadastro = await loadLeadRowsForHistorico(client, historicoRows);

  return historicoRows.map((row) => ({
    ...row,
    geleads_id: resolveGeleadsIdForHistoricoRow(row, lookup, leadRowByCadastro),
  }));
}
