import pg from 'pg';
import {
  CVCRM_TABLE_CONFIGS,
  sendLeadGeneric,
  sendLeadToCvcrm,
  sendLeadToCvcrm_oasis_ii,
} from './cvcrmService.mjs';

const CVCRM_POLL_SOURCES = [
  {
    table: 'leads_solar_bosque',
    sourceTable: 'leads_solar_bosque',
    send: sendLeadToCvcrm,
    displayName: (lead) => lead.nome ?? lead.name ?? 'Lead',
    touchUpdatedAt: true,
  },
  {
    table: 'leads_oasis_ii',
    sourceTable: 'leads_oasis_ii',
    send: sendLeadToCvcrm_oasis_ii,
    displayName: (lead) => lead.name ?? lead.nome ?? 'Lead',
    touchUpdatedAt: false,
  },
  ...Object.entries(CVCRM_TABLE_CONFIGS).map(([table, config]) => ({
    table,
    sourceTable: config.sourceTable ?? table,
    send: (lead) => sendLeadGeneric(lead, config),
    displayName: (lead) => lead.name ?? lead.nome ?? 'Lead',
    touchUpdatedAt: false,
  })),
];

/** Fontes de entrada no Neon — `leads` é a tabela unificada do GêLeads. */
export const LEAD_SOURCE_TABLES = [
  {
    key: 'solar_bosque',
    tables: ['leads_solar_bosque', 'leads_solar_do_bosque'],
    sourceTable: 'leads_solar_bosque',
    defaultPage: '/solar-do-bosque',
    defaultEmpreendimento: 'Solar do Bosque',
    mapRow: mapSolarBosqueRow,
  },
  {
    key: 'oasis_ii',
    tables: ['leads_oasis_ii'],
    sourceTable: 'leads_oasis_ii',
    defaultPage: '/oasis-ii',
    defaultEmpreendimento: 'Oásis Residencial II',
    mapRow: mapOasisIiRow,
  },
  {
    key: 'kastell',
    tables: ['leads_kastell'],
    sourceTable: 'leads_kastell',
    defaultPage: '/kastell',
    defaultEmpreendimento: 'Kastell Residencial',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'nature',
    tables: ['leads_nature'],
    sourceTable: 'leads_nature',
    defaultPage: '/nature',
    defaultEmpreendimento: 'Nature Residencial',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'oasis_i',
    tables: ['leads_oasis_i', 'leads_oasis'],
    sourceTable: 'leads_oasis_i',
    defaultPage: '/oasis',
    defaultEmpreendimento: 'Oásis Residencial',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'solar_bellavista',
    tables: ['leads_solar_bellavista', 'leads_bellavista'],
    sourceTable: 'leads_solar_bellavista',
    defaultPage: '/solar-bellavista',
    defaultEmpreendimento: 'Solar Bellavista',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'solar_flores',
    tables: ['leads_solar_flores', 'leads_flores'],
    sourceTable: 'leads_solar_flores',
    defaultPage: '/solar-das-flores',
    defaultEmpreendimento: 'Solar das Flores',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'vita',
    tables: ['leads_vita'],
    sourceTable: 'leads_vita',
    defaultPage: '/vita',
    defaultEmpreendimento: 'Vita Residencial',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'flow',
    tables: ['leads_flow'],
    sourceTable: 'leads_flow',
    defaultPage: '/flow',
    defaultEmpreendimento: 'Flow',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'aniversario_208',
    tables: ['leads_aniversario_208_anos'],
    sourceTable: 'leads_aniversario_208_anos',
    defaultPage: '/aniversario-208',
    defaultEmpreendimento: 'Solar das Flores',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'gesite',
    tables: ['leads_gesite'],
    sourceTable: 'leads_gesite',
    defaultPage: '/gesite',
    defaultEmpreendimento: 'GêSite',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'blackgenesis',
    tables: ['leads_blackgenesis'],
    sourceTable: 'leads_blackgenesis',
    defaultPage: '/black-genesis',
    defaultEmpreendimento: 'Black Gênesis',
    mapRow: mapStandardLeadRow,
  },
  {
    key: 'old',
    tables: ['leads_old'],
    sourceTable: 'leads_old',
    defaultPage: '/legado',
    defaultEmpreendimento: null,
    mapRow: mapOldLeadRow,
  },
];

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

function formatBirthDatePtBr(value) {
  if (value == null || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).trim();
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function mapLeadStatus(row) {
  if (row.cvcrm_is_sold) return 'ganho';
  if (row.profile_completed || row.completed) return 'qualificado';
  if (row.cvcrm_status) {
    const normalized = String(row.cvcrm_status).toLowerCase();
    if (normalized.includes('negoci')) return 'negociacao';
    if (normalized.includes('contato')) return 'contato';
    if (normalized.includes('perd')) return 'perdido';
  }
  return 'novo';
}

function mapCanalOrigem(row) {
  const canal = String(row.canal ?? '').trim();
  if (!canal) return 'Direto';
  if (canal.toLowerCase() === 'site') return 'Direto';
  return canal;
}

function mapCvcrmSyncStatus(row) {
  return String(row.cvcrm_sync_status ?? '').trim() || 'pending';
}

function mapCvcrmIsSold(row) {
  return Boolean(row.cvcrm_is_sold);
}

function formatUnixBirthDatePtBr(value) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  const ms = num < 1_000_000_000_000 ? num * 1000 : num;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function mapStandardLeadRow(row, sourceTable, defaults = {}) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.phone ?? '').trim();
  const canal = String(row.canal ?? '').trim();
  const empreendimento =
    String(row.empreendimento ?? '').trim() || defaults.defaultEmpreendimento || 'Lead';
  const childrenStatus = String(row.children_status ?? '').trim();
  const interesse = String(row.interesse ?? '').trim();

  return {
    id: row.id,
    source_table: sourceTable,
    name: String(row.name ?? '').trim() || 'Lead',
    email: email || null,
    phone: phone || null,
    page: interesse || defaults.defaultPage || '/',
    origem: mapCanalOrigem(row),
    canal: canal || 'Site',
    parametro: interesse || empreendimento,
    empreendimento,
    relacionamento: String(row.relationship_status ?? '').trim() || null,
    investimento: String(row.monthly_investment ?? '').trim() || null,
    cidade_residencia: String(row.current_city ?? '').trim() || null,
    birth_date: formatBirthDatePtBr(row.birth_date) || null,
    profile_type: String(row.profile_type ?? '').trim() || null,
    profile_notes: childrenStatus ? `Filhos: ${childrenStatus}` : interesse || null,
    dispositivo: null,
    pagamento_preferencia: null,
    responsavel: null,
    status: mapLeadStatus(row),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: mapCvcrmSyncStatus(row),
    cvcrm_is_sold: mapCvcrmIsSold(row),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapOldLeadRow(row, sourceTable, defaults = {}) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.phone ?? '').trim();
  const interesse = String(row.interesse ?? '').trim();
  const dataEntrada = String(row.data_entrada ?? '').trim();

  return {
    id: row.id,
    source_table: sourceTable,
    name: String(row.name ?? '').trim() || 'Lead',
    email: email || null,
    phone: phone || null,
    page: interesse || defaults.defaultPage || '/legado',
    origem: mapCanalOrigem(row),
    canal: String(row.canal ?? '').trim() || 'Site',
    parametro: interesse || null,
    empreendimento: interesse || defaults.defaultEmpreendimento || null,
    relacionamento: String(row.relationship_status ?? '').trim() || null,
    investimento: String(row.monthly_investment ?? '').trim() || null,
    cidade_residencia: String(row.current_city ?? '').trim() || null,
    birth_date: formatUnixBirthDatePtBr(row.nascimento) || null,
    profile_type: null,
    profile_notes: [interesse && `Interesse: ${interesse}`, dataEntrada && `Data entrada: ${dataEntrada}`]
      .filter(Boolean)
      .join(' | ') || null,
    dispositivo: null,
    pagamento_preferencia: null,
    responsavel: null,
    status: mapLeadStatus(row),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: mapCvcrmSyncStatus(row),
    cvcrm_is_sold: mapCvcrmIsSold(row),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

export function mapOasisIiRow(row, sourceTable, defaults = {}) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.phone ?? '').trim();
  const canal = String(row.canal ?? '').trim();
  const empreendimento =
    String(row.empreendimento ?? '').trim() || defaults.defaultEmpreendimento || 'Oásis Residencial II';
  const childrenStatus = String(row.children_status ?? '').trim();

  return {
    id: row.id,
    source_table: sourceTable,
    name: String(row.name ?? '').trim() || 'Lead',
    email: email || null,
    phone: phone || null,
    page: defaults.defaultPage || '/oasis-ii',
    origem: mapCanalOrigem(row),
    canal: canal || 'Site',
    parametro: empreendimento,
    empreendimento,
    relacionamento: String(row.relationship_status ?? '').trim() || null,
    investimento: String(row.monthly_investment ?? '').trim() || null,
    cidade_residencia: String(row.current_city ?? '').trim() || null,
    birth_date: formatBirthDatePtBr(row.birth_date) || null,
    profile_type: String(row.profile_type ?? '').trim() || null,
    profile_notes: childrenStatus ? `Filhos: ${childrenStatus}` : null,
    dispositivo: null,
    pagamento_preferencia: null,
    responsavel: null,
    status: mapLeadStatus(row),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: mapCvcrmSyncStatus(row),
    cvcrm_is_sold: mapCvcrmIsSold(row),
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export function mapSolarBosqueRow(row, sourceTable, defaults = {}) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.whatsapp ?? '').trim();
  const canal = String(row.canal ?? '').trim();
  const interesse = String(row.interesse ?? '').trim();
  const empreendimento =
    String(row.empreendimento ?? '').trim() || defaults.defaultEmpreendimento || 'Solar do Bosque';

  return {
    id: row.id,
    source_table: sourceTable,
    name: String(row.nome ?? '').trim() || 'Lead',
    email: email || null,
    phone: phone || null,
    page: interesse || defaults.defaultPage || '/solar-do-bosque',
    origem: mapCanalOrigem(row),
    canal: canal || 'Site',
    parametro: interesse || empreendimento,
    empreendimento,
    relacionamento: String(row.relationship_status ?? '').trim() || null,
    investimento: String(row.monthly_investment ?? '').trim() || null,
    cidade_residencia: String(row.current_city ?? '').trim() || null,
    birth_date: formatBirthDatePtBr(row.birth_date) || null,
    profile_type: String(row.profile_type ?? '').trim() || null,
    profile_notes: interesse || null,
    dispositivo: null,
    pagamento_preferencia: null,
    responsavel: null,
    status: mapLeadStatus(row),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: mapCvcrmSyncStatus(row),
    cvcrm_is_sold: mapCvcrmIsSold(row),
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
  };
}

const ENSURE_LEADS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  page TEXT,
  origem TEXT,
  canal TEXT,
  parametro TEXT,
  empreendimento TEXT,
  responsavel TEXT,
  relacionamento TEXT,
  investimento TEXT,
  cidade_residencia TEXT,
  birth_date TEXT,
  profile_type TEXT,
  profile_notes TEXT,
  dispositivo TEXT,
  pagamento_preferencia TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  cvcrm_lead_id TEXT,
  cvcrm_sync_status TEXT DEFAULT 'pending',
  cvcrm_is_sold BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const UPSERT_LEAD_SQL = `
INSERT INTO leads (
  id, source_table, name, email, phone, page, origem, canal, parametro,
  empreendimento, responsavel, relacionamento, investimento, cidade_residencia,
  birth_date, profile_type, profile_notes, dispositivo, pagamento_preferencia,
  status, cvcrm_lead_id, cvcrm_sync_status, cvcrm_is_sold, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9,
  $10, $11, $12, $13, $14,
  $15, $16, $17, $18, $19,
  $20, $21, $22, $23, $24, $25
)
ON CONFLICT (id) DO UPDATE SET
  source_table = EXCLUDED.source_table,
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  page = EXCLUDED.page,
  origem = EXCLUDED.origem,
  canal = EXCLUDED.canal,
  parametro = EXCLUDED.parametro,
  empreendimento = EXCLUDED.empreendimento,
  responsavel = EXCLUDED.responsavel,
  relacionamento = EXCLUDED.relacionamento,
  investimento = EXCLUDED.investimento,
  cidade_residencia = EXCLUDED.cidade_residencia,
  birth_date = EXCLUDED.birth_date,
  profile_type = EXCLUDED.profile_type,
  profile_notes = EXCLUDED.profile_notes,
  dispositivo = EXCLUDED.dispositivo,
  pagamento_preferencia = EXCLUDED.pagamento_preferencia,
  status = EXCLUDED.status,
  cvcrm_lead_id = EXCLUDED.cvcrm_lead_id,
  cvcrm_sync_status = EXCLUDED.cvcrm_sync_status,
  cvcrm_is_sold = EXCLUDED.cvcrm_is_sold,
  updated_at = EXCLUDED.updated_at;
`;

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
const SYNC_INTERVAL_MS = 300_000;
let syncInFlight = false;
/** Evita sync concorrente da mesma tabela fonte → leads */
const tableSyncInFlight = {};

async function processLeadSourceSync(client, source) {
  const tableName = await resolveSourceTable(client, source.tables);
  if (!tableName) {
    console.warn(`[leads/sync] Tabela não encontrada: ${source.tables.join(' | ')}`);
    return { source: source.key, table: null, count: 0, skipped: false };
  }

  if (tableSyncInFlight[tableName]) {
    console.log(`[leads/sync] Skipping ${tableName} as previous sync still in flight`);
    return { source: source.key, table: tableName, count: 0, skipped: true };
  }

  tableSyncInFlight[tableName] = true;
  try {
    const { rows } = await client.query(`SELECT * FROM ${tableName} ORDER BY created_at ASC`);
    let count = 0;

    for (const row of rows) {
      const mapped = source.mapRow(row, source.sourceTable, source);
      await client.query(UPSERT_LEAD_SQL, [
        mapped.id,
        mapped.source_table,
        mapped.name,
        mapped.email,
        mapped.phone,
        mapped.page,
        mapped.origem,
        mapped.canal,
        mapped.parametro,
        mapped.empreendimento,
        mapped.responsavel,
        mapped.relacionamento,
        mapped.investimento,
        mapped.cidade_residencia,
        mapped.birth_date,
        mapped.profile_type,
        mapped.profile_notes,
        mapped.dispositivo,
        mapped.pagamento_preferencia,
        mapped.status,
        mapped.cvcrm_lead_id,
        mapped.cvcrm_sync_status,
        mapped.cvcrm_is_sold,
        mapped.created_at,
        mapped.updated_at,
      ]);
      count += 1;
    }

    console.log(`[leads/sync] ${tableName}: ${count} lead(s) sincronizado(s) → leads`);
    return { source: source.key, table: tableName, count, skipped: false };
  } finally {
    tableSyncInFlight[tableName] = false;
  }
}

export async function syncLeadsFromSources({ force = false } = {}) {
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
    const sources = [];

    try {
      await client.query(ENSURE_LEADS_TABLE_SQL);
    await client.query(
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS cvcrm_sync_status TEXT DEFAULT 'pending'`,
    );
    await client.query(
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS cvcrm_is_sold BOOLEAN DEFAULT false`,
    );

      for (const source of LEAD_SOURCE_TABLES) {
        const result = await processLeadSourceSync(client, source);
        if (result.table && !result.skipped) {
          totalSynced += result.count;
          sources.push({ source: result.source, table: result.table, count: result.count });
        }
      }

      lastSyncAt = now;
      return { synced: totalSynced, sources };
    } finally {
      await client.end();
    }
  } finally {
    syncInFlight = false;
  }
}
