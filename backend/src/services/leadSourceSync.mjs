import pg from 'pg';
import { rebuildAllLeadsUnique } from './allLeadsUnique.mjs';
import {
  CVCRM_TABLE_CONFIGS,
  sendLeadGeneric,
  sendLeadToCvcrm,
  sendLeadToCvcrm_oasis_ii,
} from './cvcrmService.mjs';

const CVCRM_POLL_SOURCES = [
  {
    table: 'site_solar_bosque',
    sourceTable: 'site_solar_bosque',
    send: sendLeadToCvcrm,
    displayName: (lead) => lead.name ?? 'Lead',
    touchUpdatedAt: true,
  },
  {
    table: 'site_oasis_ii',
    sourceTable: 'site_oasis_ii',
    send: sendLeadToCvcrm_oasis_ii,
    displayName: (lead) => lead.name ?? 'Lead',
    touchUpdatedAt: false,
  },
  ...Object.entries(CVCRM_TABLE_CONFIGS).map(([table, config]) => ({
    table,
    sourceTable: config.sourceTable ?? table,
    send: (lead) => sendLeadGeneric(lead, config),
    displayName: (lead) => lead.name ?? 'Lead',
    touchUpdatedAt: false,
  })),
];

/** 14 tabelas-fonte com schema canônico idêntico (espelha VALID_SOURCE_TABLES). */
const ALL_SOURCE_TABLES = [
  'campanha_niver_208_anos_friburgo',
  'campanha_blackgenesis',
  'site_flow',
  'site_gesite',
  'site_kastell',
  'site_nature',
  'site_oasis_i',
  'site_oasis_ii',
  'leads_antigos',
  'site_solar_bellavista',
  'site_solar_bosque',
  'site_solar_flores',
  'site_vita',
  'leads_cvcrm',
];

/** Fontes de entrada no Neon — `all_leads` é união pura das 14 fontes. */
export const LEAD_SOURCE_TABLES = ALL_SOURCE_TABLES.map((table) => ({
  key: table,
  tables: [table],
  sourceTable: table,
}));

import { IGNORED_NEON_LEAD_SOURCE_TABLES } from '../ignoredLeadSources.mjs';
import {
  materializeEmpreendimentoInteresse,
  sqlCoalesceEmpreendimentoInteresse,
} from '../lib/empreendimentoInteresseNull.mjs';

export { IGNORED_NEON_LEAD_SOURCE_TABLES };

function getNeonLeadsUrl() {
  return (
    process.env.NEON_LEADS_DATABASE_URL ||
    process.env.NEON_GELEADS_DATABASE_URL ||
    process.env.NEON_GETEAMS_DATABASE_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

const CVCRM_POLL_INTERVAL_MS = 10_000;
let cvcrmPollInFlight = false;
/** Track per-table polling in-flight status */
const tablePollInFlight = {};


async function processCvcrmPendingSource(client, source) {
  // Skip if this table is already being processed by a previous poll
  if (tablePollInFlight[source.table]) {
    console.log(`[cvcrm/poll] Skipping ${source.table} as previous poll still in flight`);
    return { total: 0, synced: 0, errors: 0 };
  }
  tablePollInFlight[source.table] = true;
  try {
    const { rows } = await client.query(
      `SELECT *
       FROM ${source.table}
       WHERE cvcrm_sync_status = 'pending'
         AND cvcrm_lead_id IS NULL
       ORDER BY created_at ASC
       LIMIT 50`,
    );

    if (rows.length === 0) return { total: 0, synced: 0, errors: 0 };

    console.log(`[cvcrm/poll] ${source.table}: ${rows.length} lead(s) pendente(s) — processando...`);

    let synced = 0;
    let errors = 0;

    for (const lead of rows) {
      const result = await source.send({ ...lead, source_table: source.sourceTable });
      const label = source.displayName(lead);

      if (result.ok) {
        const touchUpdatedAt = source.touchUpdatedAt !== false ? ', updated_at = now()' : '';
        await client.query(
          `UPDATE ${source.table}
           SET cvcrm_lead_id = $1,
               cvcrm_sync_status = 'synced',
               cvcrm_last_synced_at = now(),
               cvcrm_payload = $2::jsonb,
               cvcrm_sync_error = NULL${touchUpdatedAt}
           WHERE id = $3`,
          [result.cvcrm_lead_id ?? null, JSON.stringify(result.payload ?? {}), lead.id],
        );
        synced += 1;
        console.log(`[cvcrm/poll] synced: ${label} (${source.table}, id=${lead.id}, cvcrm_lead_id=${result.cvcrm_lead_id ?? 'null'})`);
      } else {
        const touchUpdatedAt = source.touchUpdatedAt !== false ? ', updated_at = now()' : '';
        await client.query(
          `UPDATE ${source.table}
           SET cvcrm_sync_status = 'error',
               cvcrm_sync_error = $1${touchUpdatedAt}
           WHERE id = $2`,
          [result.error ?? 'Erro desconhecido ao enviar para o CVCRM', lead.id],
        );
        errors += 1;
        console.log(`[cvcrm/poll] error: ${label} (${source.table}, id=${lead.id}) — ${result.error}`);
      }
    }
    return { total: rows.length, synced, errors };
  } finally {
    tablePollInFlight[source.table] = false;
  }
  // Duplicate polling logic removed
}

async function pollCvcrmPendingLeads() {
  if (cvcrmPollInFlight) return;

  const neonUrl = process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL;
  if (!neonUrl) return;

  cvcrmPollInFlight = true;
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

  try {
    await client.connect();

    let totalFound = 0;
    let totalSynced = 0;
    let totalErrors = 0;

    for (const source of CVCRM_POLL_SOURCES) {
      try {
        const result = await processCvcrmPendingSource(client, source);
        totalFound += result.total;
        totalSynced += result.synced;
        totalErrors += result.errors;
      } catch (err) {
        if (err?.code === '42P01') continue;
        throw err;
      }
    }

    if (totalFound === 0) return;

    console.log(`[cvcrm/poll] concluído: ${totalSynced} synced, ${totalErrors} errors`);
  } catch (err) {
    console.error('[cvcrm/poll]', err);
  } finally {
    await client.end().catch(() => {});
    cvcrmPollInFlight = false;
  }
}

setInterval(() => {
  pollCvcrmPendingLeads().catch((err) => console.error('[cvcrm/poll]', err));
}, CVCRM_POLL_INTERVAL_MS);

function toNullableString(value) {
  const s = String(value ?? '').trim();
  return s || null;
}

function mapLeadCodigo(row) {
  const codigo = String(row.codigo ?? '').trim();
  return codigo || null;
}

function mapCvcrmSaleValue(row) {
  const value = row.cvcrm_sale_value;
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseCvcrmPayload(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** Copia colunas canônicas da fonte para all_leads (sem transformação por tabela). */
export function mapCanonicalLeadRow(row, sourceTable) {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    name: toNullableString(row.name) || 'Lead',
    email: toNullableString(row.email),
    phone: toNullableString(row.phone),
    gender: toNullableString(row.gender),
    birth_date: row.birth_date ?? null,
    current_city: toNullableString(row.current_city),
    relationship_status: toNullableString(row.relationship_status),
    monthly_investment: toNullableString(row.monthly_investment),
    profile_type: toNullableString(row.profile_type),
    profile_completed: Boolean(row.profile_completed),
    whatsapp_clicked: Boolean(row.whatsapp_clicked),
    canal: toNullableString(row.canal),
    empreendimento_interesse: materializeEmpreendimentoInteresse(row.empreendimento_interesse),
    parameter: Array.isArray(row.parameter) ? row.parameter : row.parameter ?? null,
    children_status: toNullableString(row.children_status),
    codigo: mapLeadCodigo(row),
    cvcrm_lead_id: toNullableString(row.cvcrm_lead_id),
    cvcrm_status: toNullableString(row.cvcrm_status),
    cvcrm_situation: toNullableString(row.cvcrm_situation),
    cvcrm_stage: toNullableString(row.cvcrm_stage),
    cvcrm_is_sold: Boolean(row.cvcrm_is_sold),
    cvcrm_sale_value: mapCvcrmSaleValue(row),
    cvcrm_sale_date: row.cvcrm_sale_date ?? null,
    cvcrm_last_update: row.cvcrm_last_update ?? null,
    cvcrm_payload: parseCvcrmPayload(row.cvcrm_payload),
    cvcrm_sync_status: toNullableString(row.cvcrm_sync_status) || 'pending',
    cvcrm_sync_error: toNullableString(row.cvcrm_sync_error),
    cvcrm_last_synced_at: row.cvcrm_last_synced_at ?? null,
    source_table: sourceTable,
  };
}

const ALL_LEADS_COLUMNS = [
  'id', 'created_at', 'updated_at', 'name', 'email', 'phone', 'gender', 'birth_date',
  'current_city', 'relationship_status', 'monthly_investment', 'profile_type',
  'profile_completed', 'whatsapp_clicked', 'canal', 'empreendimento_interesse',
  'parameter', 'children_status', 'codigo',
  'cvcrm_lead_id', 'cvcrm_status', 'cvcrm_situation', 'cvcrm_stage', 'cvcrm_is_sold',
  'cvcrm_sale_value', 'cvcrm_sale_date', 'cvcrm_last_update', 'cvcrm_payload',
  'cvcrm_sync_status', 'cvcrm_sync_error', 'cvcrm_last_synced_at',
  'source_table',
];

/** Colunas lidas das tabelas-fonte (sem cvcrm_payload jsonb no cliente). */
export const SOURCE_TABLE_SLIM_SELECT_SQL = `
  id,
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
  codigo,
  cvcrm_lead_id,
  cvcrm_status,
  cvcrm_situation,
  cvcrm_stage,
  cvcrm_is_sold,
  cvcrm_sale_value,
  cvcrm_sale_date,
  cvcrm_last_update,
  cvcrm_sync_status,
  cvcrm_sync_error,
  cvcrm_last_synced_at
`.trim();

const SOURCE_TABLE_SET = new Set(ALL_SOURCE_TABLES);

function assertSourceTableName(tableName) {
  if (!SOURCE_TABLE_SET.has(tableName)) {
    throw new Error(`[leads/sync] tabela-fonte inválida: ${tableName}`);
  }
  return tableName;
}

function srcTextTrim(alias, col, cols) {
  if (!cols.has(col)) return 'NULL::text';
  return `NULLIF(TRIM(${alias}.${col}), '')`;
}

function srcEmpreendimentoInteresse(alias, cols) {
  if (!cols.has('empreendimento_interesse')) return `'Null'::text`;
  return sqlCoalesceEmpreendimentoInteresse(`${alias}.empreendimento_interesse`);
}

/** Expressões canônicas (iguais no INSERT e na assinatura). */
function buildCanonicalSelectExprs(cols, alias) {
  const s = alias;
  return [
    `${s}.id`,
    `${s}.created_at`,
    cols.has('updated_at') ? `COALESCE(${s}.updated_at, ${s}.created_at)` : `${s}.created_at`,
    cols.has('name') ? `COALESCE(NULLIF(TRIM(${s}.name), ''), 'Lead')` : `'Lead'`,
    srcTextTrim(s, 'email', cols),
    srcTextTrim(s, 'phone', cols),
    srcTextTrim(s, 'gender', cols),
    cols.has('birth_date') ? `${s}.birth_date` : 'NULL::date',
    srcTextTrim(s, 'current_city', cols),
    srcTextTrim(s, 'relationship_status', cols),
    srcTextTrim(s, 'monthly_investment', cols),
    srcTextTrim(s, 'profile_type', cols),
    cols.has('profile_completed') ? `COALESCE(${s}.profile_completed, false)` : 'false',
    cols.has('whatsapp_clicked') ? `COALESCE(${s}.whatsapp_clicked, false)` : 'false',
    srcTextTrim(s, 'canal', cols),
    srcEmpreendimentoInteresse(s, cols),
    cols.has('parameter') ? `${s}.parameter` : 'NULL::text[]',
    srcTextTrim(s, 'children_status', cols),
    srcTextTrim(s, 'codigo', cols),
    srcTextTrim(s, 'cvcrm_lead_id', cols),
    srcTextTrim(s, 'cvcrm_status', cols),
    srcTextTrim(s, 'cvcrm_situation', cols),
    srcTextTrim(s, 'cvcrm_stage', cols),
    cols.has('cvcrm_is_sold') ? `COALESCE(${s}.cvcrm_is_sold, false)` : 'false',
    cols.has('cvcrm_sale_value') ? `${s}.cvcrm_sale_value` : 'NULL::numeric',
    cols.has('cvcrm_sale_date') ? `${s}.cvcrm_sale_date` : 'NULL::timestamptz',
    cols.has('cvcrm_last_update') ? `${s}.cvcrm_last_update` : 'NULL::timestamptz',
    cols.has('cvcrm_payload') ? `${s}.cvcrm_payload` : 'NULL::jsonb',
    cols.has('cvcrm_sync_status')
      ? `COALESCE(NULLIF(TRIM(${s}.cvcrm_sync_status), ''), 'pending')`
      : `'pending'`,
    srcTextTrim(s, 'cvcrm_sync_error', cols),
    cols.has('cvcrm_last_synced_at') ? `${s}.cvcrm_last_synced_at` : 'NULL::timestamptz',
  ];
}

const FULL_SOURCE_COLUMNS = new Set([
  'id', 'created_at', 'updated_at', 'name', 'email', 'phone', 'gender', 'birth_date',
  'current_city', 'relationship_status', 'monthly_investment', 'profile_type',
  'profile_completed', 'whatsapp_clicked', 'canal', 'empreendimento_interesse',
  'parameter', 'children_status', 'codigo',
  'cvcrm_lead_id', 'cvcrm_status', 'cvcrm_situation', 'cvcrm_stage', 'cvcrm_is_sold',
  'cvcrm_sale_value', 'cvcrm_sale_date', 'cvcrm_last_update', 'cvcrm_payload',
  'cvcrm_sync_status', 'cvcrm_sync_error', 'cvcrm_last_synced_at',
]);

function rowDigestSql(exprs) {
  const parts = exprs.map((expr) => `COALESCE((${expr})::text, '')`).join(', ');
  return `md5(CONCAT_WS('|', ${parts}))`;
}

const tableColumnCache = new Map();

async function getSourceTableColumns(client, tableName) {
  if (tableColumnCache.has(tableName)) return tableColumnCache.get(tableName);
  const { rows } = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  const set = new Set(rows.map((r) => r.column_name));
  tableColumnCache.set(tableName, set);
  return set;
}

function buildSourceTableSignatureSql(tableName, cols) {
  const table = assertSourceTableName(tableName);
  const srcExprs = buildCanonicalSelectExprs(cols, 's');
  const alExprs = buildCanonicalSelectExprs(FULL_SOURCE_COLUMNS, 'a');
  const srcRowDig = rowDigestSql(srcExprs);
  const alRowDig = rowDigestSql(alExprs);
  return `
    SELECT
      src.cnt::int AS src_count,
      al.cnt::int AS al_count,
      src.sig AS src_sig,
      al.sig AS al_sig,
      (src.cnt = al.cnt AND src.sig IS NOT DISTINCT FROM al.sig) AS unchanged
    FROM (
      SELECT COUNT(*)::bigint AS cnt,
             md5(COALESCE(string_agg(${srcRowDig}, '' ORDER BY s.id, s.created_at), '')) AS sig
      FROM ${table} s
    ) src,
    (
      SELECT COUNT(*)::bigint AS cnt,
             md5(COALESCE(string_agg(${alRowDig}, '' ORDER BY a.id, a.created_at), '')) AS sig
      FROM all_leads a
      WHERE a.source_table = $1
    ) al
  `;
}

function buildSourceConsolidateInsertSql(tableName, cols) {
  const table = assertSourceTableName(tableName);
  const selectExprs = [...buildCanonicalSelectExprs(cols, 's'), '$1::text'];
  return `
    INSERT INTO all_leads (${ALL_LEADS_COLUMNS.join(', ')})
    SELECT ${selectExprs.join(', ')}
    FROM ${table} s
    ORDER BY s.created_at ASC
  `;
}

const LEGACY_ALL_LEADS_COLUMNS = new Set([
  'page', 'origem', 'parametro', 'empreendimento', 'status', 'relacionamento', 'investimento',
  'cidade_residencia', 'profile_notes', 'dispositivo', 'pagamento_preferencia', 'responsavel',
  'idcorretor', 'idimobiliaria', 'data_primeiro_atendimento', 'data_visita_agendada',
  'data_visita_realizada', 'data_analise_credito_inicio', 'data_analise_credito_fim',
  'data_proposta', 'data_venda', 'data_perdido', 'motivo_perda',
]);

const ENSURE_ALL_LEADS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS all_leads (
  id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  gender TEXT,
  birth_date DATE,
  current_city TEXT,
  relationship_status TEXT,
  monthly_investment TEXT,
  profile_type TEXT,
  profile_completed BOOLEAN DEFAULT false,
  whatsapp_clicked BOOLEAN DEFAULT false,
  canal TEXT,
  empreendimento_interesse TEXT,
  parameter TEXT[],
  children_status TEXT,
  codigo TEXT,
  cvcrm_lead_id TEXT,
  cvcrm_status TEXT,
  cvcrm_situation TEXT,
  cvcrm_stage TEXT,
  cvcrm_is_sold BOOLEAN DEFAULT false,
  cvcrm_sale_value NUMERIC,
  cvcrm_sale_date TIMESTAMPTZ,
  cvcrm_last_update TIMESTAMPTZ,
  cvcrm_payload JSONB,
  cvcrm_sync_status TEXT DEFAULT 'pending',
  cvcrm_sync_error TEXT,
  cvcrm_last_synced_at TIMESTAMPTZ,
  source_table TEXT NOT NULL,
  PRIMARY KEY (id, source_table)
);
CREATE INDEX IF NOT EXISTS all_leads_created_at_idx ON all_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS all_leads_source_table_idx ON all_leads (source_table);
CREATE INDEX IF NOT EXISTS all_leads_codigo_idx ON all_leads (codigo);
`;

const INSERT_BATCH_SIZE = 500;

function buildBatchInsertSql(rowCount) {
  const colCount = ALL_LEADS_COLUMNS.length;
  const tuples = [];
  for (let i = 0; i < rowCount; i += 1) {
    const base = i * colCount;
    const placeholders = ALL_LEADS_COLUMNS.map((_, j) => `$${base + j + 1}`);
    tuples.push(`(${placeholders.join(', ')})`);
  }
  return `INSERT INTO all_leads (${ALL_LEADS_COLUMNS.join(', ')}) VALUES ${tuples.join(', ')}`;
}

function leadToInsertParams(mapped) {
  return ALL_LEADS_COLUMNS.map((col) => mapped[col]);
}

async function tableHasLegacyAllLeadsColumns(client) {
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'all_leads'
       AND column_name = ANY($1::text[])`,
    [[...LEGACY_ALL_LEADS_COLUMNS]],
  );
  return rows.length > 0;
}

async function ensureAllLeadsUnionSchema(client) {
  await client.query(`DROP INDEX IF EXISTS public.leads_codigo_uidx`);

  const tableCheck = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'all_leads'`,
  );

  if (tableCheck.rowCount > 0 && (await tableHasLegacyAllLeadsColumns(client))) {
    console.log('[leads/sync] Recriando all_leads com schema canônico (união pura)');
    await client.query(`DROP TABLE public.all_leads`);
  }

  await client.query(ENSURE_ALL_LEADS_TABLE_SQL);
}

async function resolveSourceTable(client, candidates) {
  for (const table of candidates) {
    const check = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    if (check.rowCount > 0) return table;
  }
  return null;
}

let lastSyncAt = 0;
let lastRebuildAt = 0;
let pendingRebuild = false;
const SYNC_INTERVAL_MS = 300_000;
/** Rebuild de all_leads_unique no máximo 1x/h após mudança real. */
const REBUILD_MIN_INTERVAL_MS = 60 * 60 * 1000;
let syncInFlight = false;
const tableSyncInFlight = {};

async function processLeadSourceSync(client, source) {
  const tableName = await resolveSourceTable(client, source.tables);
  if (!tableName) {
    console.warn(`[leads/sync] Tabela não encontrada: ${source.tables.join(' | ')}`);
    return { source: source.key, table: null, count: 0, changed: 0, skipped: false };
  }

  if (tableSyncInFlight[tableName]) {
    console.log(`[leads/sync] Skipping ${tableName} as previous sync still in flight`);
    return { source: source.key, table: tableName, count: 0, changed: 0, skipped: true };
  }

  tableSyncInFlight[tableName] = true;
  try {
    const cols = await getSourceTableColumns(client, tableName);
    const { rows: [sig] } = await client.query(
      buildSourceTableSignatureSql(tableName, cols),
      [source.sourceTable],
    );

    if (sig.unchanged) {
      console.log(`[leads/sync] ${tableName}: sem alterações (${sig.src_count} lead(s))`);
      return {
        source: source.key,
        table: tableName,
        count: sig.src_count,
        changed: 0,
        skipped: false,
      };
    }

    await client.query(`DELETE FROM all_leads WHERE source_table = $1`, [source.sourceTable]);
    await client.query(buildSourceConsolidateInsertSql(tableName, cols), [source.sourceTable]);
    const changed = Number(sig.src_count) || 0;
    console.log(
      `[leads/sync] ${tableName}: ${changed} lead(s) → all_leads (alterado; consolidação server-side)`,
    );
    return {
      source: source.key,
      table: tableName,
      count: changed,
      changed,
      skipped: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[leads/sync] ${tableName} error:`, message);
    return { source: source.key, table: tableName, count: 0, changed: 0, skipped: false, error: message };
  } finally {
    tableSyncInFlight[tableName] = false;
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.force] bypass do throttle de sync (5 min)
 * @param {boolean} [opts.truncate] TRUNCATE all_leads antes (reset total; scripts manuais)
 * @param {boolean} [opts.rebuildHint] sinaliza mudança externa (ex.: reservas) para rebuild
 */
export async function syncLeadsFromSources({ force = false, truncate = false, rebuildHint = false } = {}) {
  if (syncInFlight) return { synced: 0, sources: [], skipped: true };
  syncInFlight = true;
  try {
    const neonUrl = getNeonLeadsUrl();
    if (!neonUrl) {
      console.warn('[leads/sync] URL do Neon não configurada.');
      return { synced: 0, sources: [] };
    }

    const now = Date.now();
    if (!force && now - lastSyncAt < SYNC_INTERVAL_MS) {
      return { synced: 0, sources: [], skipped: true };
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();

    let totalSynced = 0;
    let totalChanged = 0;
    const sources = [];

    try {
      await ensureAllLeadsUnionSchema(client);

      if (truncate) {
        await client.query(`TRUNCATE all_leads`);
      }

      for (const source of LEAD_SOURCE_TABLES) {
        const result = await processLeadSourceSync(client, source);
        if (result.table && !result.skipped) {
          totalSynced += result.count;
          totalChanged += result.changed ?? 0;
          sources.push({
            source: result.source,
            table: result.table,
            count: result.count,
            changed: result.changed ?? 0,
          });
        }
      }

      const needsRebuild = totalChanged > 0 || rebuildHint;
      if (needsRebuild) {
        pendingRebuild = true;
      }

      const rebuildDue = pendingRebuild && now - lastRebuildAt >= REBUILD_MIN_INTERVAL_MS;
      let uniqueResult = null;
      if (rebuildDue) {
        uniqueResult = await rebuildAllLeadsUnique(client);
        lastRebuildAt = now;
        pendingRebuild = false;
      } else if (pendingRebuild) {
        console.log(
          '[leads/unique] rebuild adiado (mudança detectada; intervalo mínimo de 1h não atingido)',
        );
      } else {
        console.log('[leads/unique] rebuild ignorado (sem mudança real em all_leads)');
      }

      lastSyncAt = now;
      return {
        synced: totalSynced,
        changed: totalChanged,
        sources,
        unique: uniqueResult,
        uniqueSkipped: !rebuildDue,
        rebuildPending: pendingRebuild,
      };
    } finally {
      await client.end();
    }
  } finally {
    syncInFlight = false;
  }
}
