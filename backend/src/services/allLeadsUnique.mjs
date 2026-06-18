import { randomUUID } from 'node:crypto';
import {
  pickPersonCanalBucket,
  resolveFonteFromBucket,
} from '../lib/leadsCanalMap.mjs';
import { ensureGeleadsIdSchema, createGeleadsIdResolver, reconcileGeleadsRegistryActive } from '../lib/geleadsIdRegistry.mjs';
import {
  normalizePersonCvcrmLeadId,
  normalizePersonEmail,
  normalizePersonPhone,
} from '../lib/personUnionKeys.mjs';

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function splitIdleadIds(idlead) {
  const raw = toSafeString(idlead);
  if (!raw) return [];
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}

function isReservaSaleIndicated(reserva) {
  if (!reserva) return false;
  const sit = String(reserva.situacao ?? '').toLowerCase();
  if (sit.includes('vendida')) return true;
  if (reserva.aprovada === true) return true;
  return false;
}

const UNIQUE_INSERT_COLUMNS = [
  'person_id', 'geleads_id', 'name', 'email', 'phone', 'empreendimento_interesse', 'canal', 'source_table',
  'parameter', 'birth_date', 'gender', 'current_city', 'relationship_status',
  'monthly_investment', 'profile_type', 'profile_completed', 'whatsapp_clicked',
  'children_status', 'cvcrm_lead_id', 'cvcrm_status', 'cvcrm_situation', 'cvcrm_stage',
  'cvcrm_is_sold', 'cvcrm_sale_value', 'cvcrm_sale_date', 'cvcrm_last_update',
  'idcorretor', 'idimobiliaria', 'signup_count', 'canal_bucket', 'fonte',
  'has_reserva', 'has_venda', 'created_at', 'updated_at',
];

const ENSURE_ALL_LEADS_UNIQUE_SQL = `
CREATE TABLE IF NOT EXISTS all_leads_unique (
  person_id UUID PRIMARY KEY,
  geleads_id TEXT,
  name TEXT[] NOT NULL DEFAULT '{}',
  email TEXT[] NOT NULL DEFAULT '{}',
  phone TEXT[] NOT NULL DEFAULT '{}',
  empreendimento_interesse TEXT[] NOT NULL DEFAULT '{}',
  canal TEXT[] NOT NULL DEFAULT '{}',
  source_table TEXT[] NOT NULL DEFAULT '{}',
  parameter TEXT[] NOT NULL DEFAULT '{}',
  birth_date DATE,
  gender TEXT,
  current_city TEXT,
  relationship_status TEXT,
  monthly_investment TEXT,
  profile_type TEXT,
  profile_completed BOOLEAN,
  whatsapp_clicked BOOLEAN,
  children_status TEXT,
  cvcrm_lead_id TEXT,
  cvcrm_status TEXT,
  cvcrm_situation TEXT,
  cvcrm_stage TEXT,
  cvcrm_is_sold BOOLEAN,
  cvcrm_sale_value NUMERIC,
  cvcrm_sale_date TIMESTAMPTZ,
  cvcrm_last_update TIMESTAMPTZ,
  idcorretor TEXT,
  idimobiliaria TEXT,
  signup_count INT NOT NULL,
  canal_bucket TEXT,
  fonte TEXT,
  has_reserva BOOLEAN NOT NULL DEFAULT false,
  has_venda BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS all_leads_unique_created_at_idx ON all_leads_unique (created_at DESC);
CREATE INDEX IF NOT EXISTS all_leads_unique_cvcrm_lead_id_idx ON all_leads_unique (cvcrm_lead_id);
`;

const ENSURE_UNIQUE_COLUMNS_SQL = `
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS geleads_id TEXT;
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS canal_bucket TEXT;
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS fonte TEXT;
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS has_reserva BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE all_leads_unique ADD COLUMN IF NOT EXISTS has_venda BOOLEAN NOT NULL DEFAULT false;
`;

const ENSURE_UNIQUE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS all_leads_unique_canal_bucket_idx ON all_leads_unique (canal_bucket);
CREATE INDEX IF NOT EXISTS all_leads_unique_fonte_idx ON all_leads_unique (fonte);
`;

const ENSURE_ALL_LEADS_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS all_leads_created_at_idx ON all_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS all_leads_canal_norm_idx ON all_leads (LOWER(TRIM(canal)));
CREATE INDEX IF NOT EXISTS all_leads_empreendimento_idx ON all_leads (empreendimento_interesse);
`;

const INSERT_BATCH_SIZE = 200;

/** Colunas lidas do rebuild (cluster + aggregate + geleads_id signup keys). */
export const ALL_LEADS_REBUILD_SELECT_SQL = `
  id,
  source_table,
  created_at,
  updated_at,
  name,
  email,
  phone,
  gender,
  birth_date,
  current_city,
  relationship_status,
  monthly_investment,
  profile_type,
  profile_completed,
  whatsapp_clicked,
  canal,
  empreendimento_interesse,
  parameter,
  children_status,
  cvcrm_lead_id,
  cvcrm_status,
  cvcrm_situation,
  cvcrm_stage,
  cvcrm_is_sold,
  cvcrm_sale_value,
  cvcrm_sale_date,
  cvcrm_last_update,
  cvcrm_payload->>'idcorretor' AS cvcrm_payload_idcorretor,
  cvcrm_payload->>'idimobiliaria' AS cvcrm_payload_idimobiliaria
`.trim();

export { normalizePersonCvcrmLeadId, normalizePersonEmail, normalizePersonPhone } from '../lib/personUnionKeys.mjs';

function clusterOldestCreatedTs(rows) {
  return rows.reduce((min, row) => {
    const ts = createdAtTimestamp(row);
    return ts < min ? ts : min;
  }, Infinity);
}

class UnionFind {
  constructor(size) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = Array(size).fill(0);
  }

  find(x) {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a, b) {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;
    if (this.rank[rootA] < this.rank[rootB]) {
      this.parent[rootA] = rootB;
    } else if (this.rank[rootA] > this.rank[rootB]) {
      this.parent[rootB] = rootA;
    } else {
      this.parent[rootB] = rootA;
      this.rank[rootA] += 1;
    }
  }
}

function toNullableString(value) {
  const s = String(value ?? '').trim();
  return s || null;
}

function rowTimestamp(row) {
  const candidates = [row.cvcrm_last_update, row.updated_at, row.created_at];
  for (const value of candidates) {
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return 0;
}

function createdAtTimestamp(row) {
  const ts = new Date(row.created_at).getTime();
  return Number.isFinite(ts) ? ts : Infinity;
}

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((a, b) => createdAtTimestamp(b) - createdAtTimestamp(a));
}

function sortByRecencyDesc(rows) {
  return [...rows].sort((a, b) => rowTimestamp(b) - rowTimestamp(a));
}

function pickMostRecentScalar(rows, field) {
  for (const row of sortByCreatedAtDesc(rows)) {
    const value = row[field];
    if (value === null || value === undefined) continue;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string' && !value.trim()) continue;
    return value;
  }
  return null;
}

function uniqueStrings(values) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const s = String(value ?? '').trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function collectParameterArray(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const param = row.parameter;
    if (!Array.isArray(param)) continue;
    for (const item of param) {
      const s = String(item ?? '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function pickCvSnapshot(rows) {
  const withCv = rows.filter(
    (row) =>
      toNullableString(row.cvcrm_lead_id)
      || toNullableString(row.cvcrm_status)
      || toNullableString(row.cvcrm_situation)
      || toNullableString(row.cvcrm_stage)
      || row.cvcrm_is_sold
      || row.cvcrm_sale_value != null
      || row.cvcrm_sale_date != null
      || row.cvcrm_last_update != null,
  );
  const source = sortByRecencyDesc(withCv.length > 0 ? withCv : rows)[0];
  if (!source) {
    return {
      cvcrm_lead_id: null,
      cvcrm_status: null,
      cvcrm_situation: null,
      cvcrm_stage: null,
      cvcrm_is_sold: null,
      cvcrm_sale_value: null,
      cvcrm_sale_date: null,
      cvcrm_last_update: null,
    };
  }
  return {
    cvcrm_lead_id: toNullableString(source.cvcrm_lead_id),
    cvcrm_status: toNullableString(source.cvcrm_status),
    cvcrm_situation: toNullableString(source.cvcrm_situation),
    cvcrm_stage: toNullableString(source.cvcrm_stage),
    cvcrm_is_sold: source.cvcrm_is_sold == null ? null : Boolean(source.cvcrm_is_sold),
    cvcrm_sale_value: source.cvcrm_sale_value ?? null,
    cvcrm_sale_date: source.cvcrm_sale_date ?? null,
    cvcrm_last_update: source.cvcrm_last_update ?? null,
  };
}

function attributionFromLeadRow(row) {
  return {
    idcorretor: toNullableString(row.cvcrm_payload_idcorretor),
    idimobiliaria: toNullableString(row.cvcrm_payload_idimobiliaria),
  };
}

function resolveAttribution(rows, reservasByIdlead) {
  const cvcrmIds = uniqueStrings(rows.map((row) => row.cvcrm_lead_id));

  for (const idlead of cvcrmIds) {
    const reserva = reservasByIdlead.get(idlead);
    if (!reserva) continue;
    const idcorretor = toNullableString(reserva.idcorretor);
    const idimobiliaria = toNullableString(reserva.idimobiliaria);
    if (idcorretor || idimobiliaria) {
      return { idcorretor, idimobiliaria };
    }
  }

  for (const row of sortByRecencyDesc(rows)) {
    const fromPayload = attributionFromLeadRow(row);
    if (fromPayload.idcorretor || fromPayload.idimobiliaria) {
      return fromPayload;
    }
  }

  return { idcorretor: null, idimobiliaria: null };
}

export function clusterAllLeadsRows(rows) {
  if (rows.length === 0) return [];

  const uf = new UnionFind(rows.length);
  const emailOwner = new Map();
  const phoneOwner = new Map();
  const cvcrmLeadIdOwner = new Map();

  for (let i = 0; i < rows.length; i += 1) {
    const email = normalizePersonEmail(rows[i].email);
    const phone = normalizePersonPhone(rows[i].phone);
    const cvcrmLeadId = normalizePersonCvcrmLeadId(rows[i].cvcrm_lead_id);

    if (email) {
      if (emailOwner.has(email)) uf.union(i, emailOwner.get(email));
      else emailOwner.set(email, i);
    }
    if (phone) {
      if (phoneOwner.has(phone)) uf.union(i, phoneOwner.get(phone));
      else phoneOwner.set(phone, i);
    }
    if (cvcrmLeadId) {
      if (cvcrmLeadIdOwner.has(cvcrmLeadId)) uf.union(i, cvcrmLeadIdOwner.get(cvcrmLeadId));
      else cvcrmLeadIdOwner.set(cvcrmLeadId, i);
    }
  }

  const clusters = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const root = uf.find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(rows[i]);
  }

  return [...clusters.values()];
}

function resolvePersonReservaFlags(rows, reservaIdleads, vendaIdleads) {
  let has_reserva = false;
  let has_venda = false;
  for (const row of rows) {
    for (const idlead of splitIdleadIds(row.cvcrm_lead_id)) {
      if (reservaIdleads.has(idlead)) has_reserva = true;
      if (vendaIdleads.has(idlead)) has_venda = true;
    }
  }
  return { has_reserva, has_venda };
}

export function aggregatePersonCluster(rows, soldReservasByIdlead = new Map(), reservaFlags = null) {
  const sortedByCreated = sortByCreatedAtDesc(rows);
  const cv = pickCvSnapshot(rows);
  const attribution = resolveAttribution(rows, soldReservasByIdlead);

  const oldestCreated = rows.reduce((min, row) => {
    const ts = createdAtTimestamp(row);
    return ts < min ? ts : min;
  }, Infinity);

  const canalValues = rows.map((row) => row.canal);
  const canal_bucket = pickPersonCanalBucket(canalValues);
  const fonte = resolveFonteFromBucket(canal_bucket);
  const { has_reserva, has_venda } = reservaFlags
    ? resolvePersonReservaFlags(rows, reservaFlags.reservaIdleads, reservaFlags.vendaIdleads)
    : { has_reserva: false, has_venda: false };

  return {
    person_id: randomUUID(),
    geleads_id: null,
    name: uniqueStrings(rows.map((row) => row.name)),
    email: uniqueStrings(rows.map((row) => row.email)),
    phone: uniqueStrings(rows.map((row) => row.phone)),
    empreendimento_interesse: uniqueStrings(rows.map((row) => row.empreendimento_interesse)),
    canal: uniqueStrings(rows.map((row) => row.canal)),
    source_table: uniqueStrings(rows.map((row) => row.source_table)),
    parameter: collectParameterArray(rows),
    birth_date: pickMostRecentScalar(rows, 'birth_date'),
    gender: pickMostRecentScalar(rows, 'gender'),
    current_city: pickMostRecentScalar(rows, 'current_city'),
    relationship_status: pickMostRecentScalar(rows, 'relationship_status'),
    monthly_investment: pickMostRecentScalar(rows, 'monthly_investment'),
    profile_type: pickMostRecentScalar(rows, 'profile_type'),
    profile_completed: pickMostRecentScalar(rows, 'profile_completed'),
    whatsapp_clicked: pickMostRecentScalar(rows, 'whatsapp_clicked'),
    children_status: pickMostRecentScalar(rows, 'children_status'),
    ...cv,
    ...attribution,
    signup_count: rows.length,
    canal_bucket,
    fonte,
    has_reserva,
    has_venda,
    created_at: oldestCreated === Infinity ? new Date('2099-01-01T00:00:00.000Z') : new Date(oldestCreated),
    updated_at: new Date(),
  };
}

async function loadReservaFlagsByIdlead(client) {
  const reservaIdleads = new Set();
  const vendaIdleads = new Set();
  try {
    const { rows } = await client.query(
      `SELECT idlead, situacao, data_venda, payload->>'data_venda' AS payload_data_venda
       FROM cvcrm_reservas
       WHERE NULLIF(TRIM(idlead), '') IS NOT NULL`,
    );
    for (const row of rows) {
      const isVenda =
        String(row.situacao ?? '').toLowerCase().includes('vendida')
        || row.data_venda != null
        || String(row.payload_data_venda ?? '').trim() !== '';
      for (const idlead of splitIdleadIds(row.idlead)) {
        reservaIdleads.add(idlead);
        if (isVenda) vendaIdleads.add(idlead);
      }
    }
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }
  return { reservaIdleads, vendaIdleads };
}

async function loadReservasAttributionByIdlead(client) {
  const map = new Map();
  try {
    const { rows } = await client.query(
      `SELECT idlead, idcorretor, idimobiliaria, situacao, aprovada, data_venda, last_synced_at
       FROM cvcrm_reservas
       WHERE NULLIF(TRIM(idlead), '') IS NOT NULL
       ORDER BY
         CASE WHEN TRIM(situacao) = 'Vendida' THEN 0 ELSE 1 END,
         NULLIF(TRIM(payload->>'data_venda'), '') DESC NULLS LAST,
         last_synced_at DESC`,
    );
    for (const row of rows) {
      for (const idlead of splitIdleadIds(row.idlead)) {
        if (!map.has(idlead)) map.set(idlead, row);
      }
    }
  } catch (err) {
    if (err?.code !== '42P01') throw err;
  }
  return map;
}

function buildBatchInsertSql(rowCount) {
  const colCount = UNIQUE_INSERT_COLUMNS.length;
  const tuples = [];
  for (let i = 0; i < rowCount; i += 1) {
    const base = i * colCount;
    const placeholders = UNIQUE_INSERT_COLUMNS.map((_, j) => `$${base + j + 1}`);
    tuples.push(`(${placeholders.join(', ')})`);
  }
  return `INSERT INTO all_leads_unique (${UNIQUE_INSERT_COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}`;
}

function personToInsertParams(person) {
  if (!person.geleads_id) {
    throw new Error(`[leads/unique] geleads_id ausente antes do INSERT (person_id=${person.person_id})`);
  }
  return UNIQUE_INSERT_COLUMNS.map((col) => person[col]);
}

/** Lê all_leads, clusteriza por email/telefone (union-find) e repovoa all_leads_unique. */
export async function rebuildAllLeadsUnique(client) {
  await client.query(ENSURE_ALL_LEADS_UNIQUE_SQL);
  await client.query(ENSURE_UNIQUE_COLUMNS_SQL);
  await client.query(ENSURE_UNIQUE_INDEXES_SQL);
  await client.query(ENSURE_ALL_LEADS_INDEXES_SQL);
  await ensureGeleadsIdSchema(client);

  const { rows } = await client.query(
    `SELECT ${ALL_LEADS_REBUILD_SELECT_SQL} FROM all_leads ORDER BY created_at ASC`,
  );
  const soldReservasByIdlead = await loadReservasAttributionByIdlead(client);
  const { reservaIdleads, vendaIdleads } = await loadReservaFlagsByIdlead(client);

  const clusters = clusterAllLeadsRows(rows);
  clusters.sort((a, b) => clusterOldestCreatedTs(a) - clusterOldestCreatedTs(b));

  const resolver = await createGeleadsIdResolver(client);
  const persons = [];
  for (const cluster of clusters) {
    const person = aggregatePersonCluster(cluster, soldReservasByIdlead, {
      reservaIdleads,
      vendaIdleads,
    });
    person.geleads_id = resolver.resolveForCluster(cluster, person.created_at);
    persons.push(person);
  }
  await resolver.flush();
  await reconcileGeleadsRegistryActive(
    client,
    persons.map((p) => p.geleads_id).filter(Boolean),
  );

  await client.query(`TRUNCATE all_leads_unique`);

  for (let i = 0; i < persons.length; i += INSERT_BATCH_SIZE) {
    const chunk = persons.slice(i, i + INSERT_BATCH_SIZE);
    if (chunk.length === 0) continue;
    await client.query(buildBatchInsertSql(chunk.length), chunk.flatMap(personToInsertParams));
  }

  const { rows: [geleadsCheck] } = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(geleads_id)::int AS with_id
    FROM all_leads_unique
  `);
  if (geleadsCheck.total > 0 && geleadsCheck.with_id !== geleadsCheck.total) {
    throw new Error(
      `[leads/unique] geleads_id NULL em ${geleadsCheck.total - geleadsCheck.with_id} de ${geleadsCheck.total} linha(s) após INSERT`,
    );
  }

  const merged = rows.length - persons.length;
  console.log(
    `[leads/unique] ${persons.length} pessoa(s) ← ${rows.length} signup(s) (${merged} merge(s))`,
  );

  return {
    all_leads: rows.length,
    unique: persons.length,
    merges: merged,
  };
}
