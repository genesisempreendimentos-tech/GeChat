import pg from 'pg';
import { syncLeadsFromSources } from './leadSourceSync.mjs';

/** Tabelas-fonte onde o sync em lote pode gravar (allowlist). */
export const VALID_SOURCE_TABLES = [
  'leads_aniversario_208_anos',
  'leads_blackgenesis',
  'leads_flow',
  'leads_gesite',
  'leads_kastell',
  'leads_nature',
  'leads_oasis_i',
  'leads_oasis_ii',
  'leads_old',
  'leads_solar_bellavista',
  'leads_solar_bosque',
  'leads_solar_flores',
  'leads_vita',
  'leads_cvcrm',
];

export const VALID_SOURCE_TABLES_SET = new Set(VALID_SOURCE_TABLES);

/** @deprecated Use VALID_SOURCE_TABLES */
export const CVCRM_WEBHOOK_TABLES = VALID_SOURCE_TABLES;

const TABLES_WITH_UPDATED_AT = new Set(['leads_solar_bosque', 'leads_cvcrm']);

const CVCRM_CVDW_LEADS_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/leads';
const CVDW_PAGE_SIZE = 500;
const BATCH_SYNC_MIN_INTERVAL_MS = 30_000;
const DAILY_SYNC_HOUR = 23;
const DAILY_SYNC_MINUTE = 59;

let batchSyncInFlight = false;
let lastBatchSyncAt = 0;
let lastDailySyncDate = null;

function trimEnv(key) {
  return String(process.env[key] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

export function getNeonLeadsUrl() {
  return process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL || null;
}

export function getCvcrmCredentials() {
  return {
    email: trimEnv('CVCRM_EMAIL'),
    token: trimEnv('CVCRM_TOKEN'),
  };
}

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function toLeadIdNumber(idlead) {
  const n = Number(idlead);
  return Number.isFinite(n) ? n : idlead;
}

function extractLeadPayload(body) {
  if (!body) return null;
  if (Array.isArray(body)) return body[0] ?? null;
  if (body.lead && typeof body.lead === 'object') return body.lead;
  return body;
}

function brtNowParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  return { date: `${p.year}-${p.month}-${p.day}`, hour, minute: Number(p.minute) };
}

export function todayReferenceDate() {
  return brtNowParts().date;
}

const AUDIT_FIELD_KEYS = [
  'cvcrm_situation',
  'cvcrm_status',
  'cvcrm_stage',
  'cvcrm_is_sold',
  'documento_cliente',
  'cvcrm_last_update',
  'idsituacao',
];

function normalizeAuditValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'boolean') return value;
  return String(value);
}

function auditValuesEqual(a, b) {
  return normalizeAuditValue(a) === normalizeAuditValue(b);
}

function fieldsToAuditMap(fields) {
  return {
    cvcrm_situation: fields.cvcrm_situation,
    cvcrm_status: fields.cvcrm_status,
    cvcrm_stage: fields.cvcrm_stage,
    cvcrm_is_sold: fields.cvcrm_is_sold,
    documento_cliente: fields.documento_cliente,
    cvcrm_last_update: fields.cvcrm_last_update,
    idsituacao: fields.idsituacao,
  };
}

async function fetchCurrentAuditValues(client, tableName, idlead) {
  const cols = [];
  for (const col of AUDIT_FIELD_KEYS) {
    if (await columnExists(client, tableName, col)) {
      cols.push(col);
    }
  }

  let nameCol = null;
  if (await columnExists(client, tableName, 'nome')) nameCol = 'nome';
  else if (await columnExists(client, tableName, 'name')) nameCol = 'name';

  const selectCols = [...cols];
  if (nameCol) selectCols.push(nameCol);

  if (selectCols.length === 0) {
    const exists = await client.query(
      `SELECT 1 FROM ${tableName} WHERE cvcrm_lead_id = $1 LIMIT 1`,
      [String(idlead)],
    );
    return exists.rowCount > 0 ? {} : null;
  }

  const result = await client.query(
    `SELECT ${selectCols.join(', ')} FROM ${tableName} WHERE cvcrm_lead_id = $1 LIMIT 1`,
    [String(idlead)],
  );
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

function computeAuditChanges(current, fields, isNewInsert) {
  const novoMap = fieldsToAuditMap(fields);
  const changes = {};

  for (const field of AUDIT_FIELD_KEYS) {
    const novo = novoMap[field] ?? null;
    const atual = current?.[field] ?? null;

    if (isNewInsert) {
      if (novo !== null && novo !== undefined && novo !== '') {
        changes[field] = { de: null, para: normalizeAuditValue(novo) };
      }
      continue;
    }

    if (!auditValuesEqual(atual, novo)) {
      changes[field] = {
        de: normalizeAuditValue(atual),
        para: normalizeAuditValue(novo),
      };
    }
  }

  return changes;
}

async function logCvcrmLeadUpdate(client, entry) {
  const { idlead, cvcrmLeadId, leadName, sourceTable, action, changes } = entry;
  if (!changes || Object.keys(changes).length === 0) return;

  const idleadParam = idlead == null ? null : toLeadIdNumber(idlead);
  const changesJson = JSON.stringify(changes ?? {});

  try {
    await client.query(
      `INSERT INTO cvcrm_lead_updates (
         idlead,
         cvcrm_lead_id,
         lead_name,
         source_table,
         action,
         changes
       ) VALUES ($1::bigint, $2::text, $3::text, $4::text, $5::text, $6::jsonb)`,
      [
        idleadParam,
        cvcrmLeadId ?? null,
        leadName ?? null,
        sourceTable ?? null,
        action ?? null,
        changesJson,
      ],
    );
  } catch (err) {
    console.error('[cvcrm/batch] Erro ao gravar cvcrm_lead_updates:', err?.message ?? err);
  }
}

function resolveStageDateColumns(stage, situation, isSold) {
  const texts = [stage, situation].filter(Boolean).join(' ');
  const columns = [];

  if (isSold || /venda/i.test(texts)) columns.push('data_venda');
  if (/proposta/i.test(texts)) columns.push('data_proposta');

  if (/cr[eé]dito/i.test(texts) || /financiamento/i.test(texts) || /an[aá]lise/i.test(texts)) {
    columns.push('data_analise_credito_inicio');
    if (
      /aprov/i.test(texts) ||
      /reprov/i.test(texts) ||
      /negad/i.test(texts) ||
      /recus/i.test(texts) ||
      /indefer/i.test(texts)
    ) {
      columns.push('data_analise_credito_fim');
    }
  }

  if (/visita/i.test(texts)) {
    if (/agendad/i.test(texts)) {
      columns.push('data_visita_agendada');
    } else {
      columns.push('data_visita_realizada');
    }
  }

  if (/atendimento/i.test(texts) || /contato/i.test(texts) || /corretor/i.test(texts)) {
    columns.push('data_primeiro_atendimento');
  }

  if (/perdid/i.test(texts) || /descart/i.test(texts)) columns.push('data_perdido');

  return [...new Set(columns)];
}

export function parseCvcrmLeadResponse(body) {
  const lead = extractLeadPayload(body);
  if (!lead || typeof lead !== 'object') {
    return {
      cvcrm_status: null,
      cvcrm_situation: null,
      cvcrm_stage: null,
      cvcrm_is_sold: false,
      documento_cliente: null,
      cvcrm_last_update: null,
      idsituacao: null,
    };
  }

  const situation = toSafeString(
    lead.situacao ?? lead.situation ?? lead.situacao_atual ?? lead.cvcrm_situation,
  );
  const idsituacao = toSafeString(lead.idsituacao) || null;
  const stage =
    situation ||
    idsituacao ||
    toSafeString(lead.estagio ?? lead.stage ?? lead.fase ?? lead.cvcrm_stage);
  const status = situation || toSafeString(lead.status ?? lead.situacao_lead ?? lead.cvcrm_status);
  const cvcrm_is_sold = situation === 'Venda Realizada';

  return {
    cvcrm_status: status || null,
    cvcrm_situation: situation || null,
    cvcrm_stage: stage || null,
    cvcrm_is_sold,
    documento_cliente: toSafeString(lead.documento_cliente) || null,
    cvcrm_last_update: lead.data_ultima_alteracao ?? null,
    idsituacao,
  };
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return result.rowCount > 0;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  );
  return result.rowCount > 0;
}

async function cvcrmApiRequest(method, url) {
  const { email, token } = getCvcrmCredentials();
  if (!email || !token) {
    throw new Error('CVCRM_EMAIL e CVCRM_TOKEN não configurados.');
  }

  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      email,
      token,
    },
  });

  const text = await res.text();
  let parsedBody = null;
  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = text || null;
  }

  console.log(
    `[cvcrm/batch] CVCRM ${method} ${url} → HTTP ${res.status}`,
    text?.slice(0, 4000) ?? '(vazio)',
  );

  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `CVCRM CVDW indisponível: ${method} ${url} → ${res.status} (${text || 'sem body'})`,
    );
  }

  return parsedBody ?? {};
}

async function fetchCvdwLeadsPage(pagina) {
  const params = new URLSearchParams({
    a_partir_data_referencia: todayReferenceDate(),
    registros_por_pagina: String(CVDW_PAGE_SIZE),
    pagina: String(pagina),
  });
  const url = `${CVCRM_CVDW_LEADS_URL}?${params}`;
  return cvcrmApiRequest('GET', url);
}

export async function fetchAllCvdwLeadsToday() {
  const allLeads = [];
  let pagina = 1;
  let totalPages = 1;

  while (pagina <= totalPages) {
    const pageData = await fetchCvdwLeadsPage(pagina);
    const dados = Array.isArray(pageData.dados) ? pageData.dados : [];
    allLeads.push(...dados);
    totalPages = Number(pageData.total_de_paginas) || 1;
    pagina += 1;
  }

  return allLeads;
}

function assertValidSourceTable(tableName) {
  if (!VALID_SOURCE_TABLES_SET.has(tableName)) {
    throw new Error(`Tabela-fonte não permitida: ${tableName}`);
  }
}

export async function resolveLeadSourceTable(client, idlead) {
  const result = await client.query(
    `SELECT source_table FROM leads WHERE cvcrm_lead_id = $1 LIMIT 1`,
    [String(idlead)],
  );
  const sourceTable = toSafeString(result.rows[0]?.source_table);
  if (sourceTable && VALID_SOURCE_TABLES_SET.has(sourceTable)) {
    return sourceTable;
  }
  return null;
}

async function updateLeadTable(client, tableName, idlead, fields, cvcrmLead) {
  assertValidSourceTable(tableName);

  const stageDateColumns = resolveStageDateColumns(
    fields.cvcrm_stage,
    fields.cvcrm_situation,
    fields.cvcrm_is_sold,
  );
  const referenceDate = fields.cvcrm_last_update ?? null;
  const setClauses = [
    'cvcrm_status = $1',
    'cvcrm_situation = $2',
    'cvcrm_stage = $3',
    'cvcrm_last_update = COALESCE($4::timestamptz, now())',
    'cvcrm_payload = $5::jsonb',
    'cvcrm_is_sold = $6',
  ];
  if (await columnExists(client, tableName, 'cvcrm_sync_status')) {
    setClauses.push("cvcrm_sync_status = 'synced'");
  }
  if (await columnExists(client, tableName, 'cvcrm_last_synced_at')) {
    setClauses.push('cvcrm_last_synced_at = now()');
  }
  const params = [
    fields.cvcrm_status ?? null,
    fields.cvcrm_situation ?? null,
    fields.cvcrm_stage ?? null,
    fields.cvcrm_last_update ?? null,
    JSON.stringify(cvcrmLead ?? {}),
    fields.cvcrm_is_sold ?? false,
  ];
  let paramIndex = 7;

  const existingStageDateColumns = [];
  for (const col of stageDateColumns) {
    if (await columnExists(client, tableName, col)) {
      existingStageDateColumns.push(col);
    }
  }

  if (existingStageDateColumns.length > 0 && referenceDate) {
    const stageDateParam = paramIndex;
    params.push(referenceDate);
    paramIndex += 1;
    for (const col of existingStageDateColumns) {
      setClauses.push(`${col} = COALESCE(${col}, $${stageDateParam}::timestamptz)`);
    }
  } else if (existingStageDateColumns.length > 0) {
    for (const col of existingStageDateColumns) {
      setClauses.push(`${col} = COALESCE(${col}, now())`);
    }
  }

  const hasDocumentoCliente = fields.documento_cliente
    ? await columnExists(client, tableName, 'documento_cliente')
    : false;
  if (hasDocumentoCliente) {
    setClauses.push(`documento_cliente = $${paramIndex}`);
    params.push(fields.documento_cliente);
    paramIndex += 1;
  }

  const hasIdsituacao = fields.idsituacao
    ? await columnExists(client, tableName, 'idsituacao')
    : false;
  if (hasIdsituacao) {
    setClauses.push(`idsituacao = $${paramIndex}`);
    params.push(fields.idsituacao);
    paramIndex += 1;
  }

  if (TABLES_WITH_UPDATED_AT.has(tableName)) {
    setClauses.push('updated_at = now()');
  }

  params.push(String(idlead));
  const result = await client.query(
    `UPDATE ${tableName}
     SET ${setClauses.join(',\n         ')}
     WHERE cvcrm_lead_id = $${paramIndex}
     RETURNING id, empreendimento`,
    params,
  );
  const row = result.rows[0];
  return {
    count: result.rowCount ?? 0,
    leadUuid: row?.id ?? null,
    empreendimento: row?.empreendimento ?? null,
  };
}

async function upsertLeadsCvcrm(client, idlead, cvcrmLead, fields) {
  assertValidSourceTable('leads_cvcrm');

  if (!(await tableExists(client, 'leads_cvcrm'))) {
    throw new Error('Tabela leads_cvcrm não existe. Execute neon-leads-cvcrm.sql.');
  }

  const nome = toSafeString(cvcrmLead.nome) || 'Sem nome';
  const whatsapp = toSafeString(cvcrmLead.telefone) || '';
  const email = toSafeString(cvcrmLead.email) || null;
  const empreendimento = toSafeString(cvcrmLead.empreendimento) || null;
  const canal = toSafeString(cvcrmLead.origem_nome ?? cvcrmLead.origem) || null;

  const result = await client.query(
    `INSERT INTO leads_cvcrm (
       nome,
       whatsapp,
       email,
       empreendimento,
       canal,
       cvcrm_lead_id,
       cvcrm_status,
       cvcrm_situation,
       cvcrm_stage,
       cvcrm_is_sold,
       cvcrm_last_update,
       cvcrm_payload,
       cvcrm_sync_status,
       cvcrm_last_synced_at,
       updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11::timestamptz, $12::jsonb, 'synced', now(), now()
     )
     ON CONFLICT (cvcrm_lead_id) DO UPDATE SET
       nome = EXCLUDED.nome,
       whatsapp = EXCLUDED.whatsapp,
       email = EXCLUDED.email,
       empreendimento = EXCLUDED.empreendimento,
       canal = EXCLUDED.canal,
       cvcrm_status = EXCLUDED.cvcrm_status,
       cvcrm_situation = EXCLUDED.cvcrm_situation,
       cvcrm_stage = EXCLUDED.cvcrm_stage,
       cvcrm_is_sold = EXCLUDED.cvcrm_is_sold,
       cvcrm_last_update = EXCLUDED.cvcrm_last_update,
       cvcrm_payload = EXCLUDED.cvcrm_payload,
       cvcrm_sync_status = 'synced',
       cvcrm_last_synced_at = now(),
       updated_at = now()
     RETURNING id, empreendimento`,
    [
      nome,
      whatsapp,
      email ?? null,
      empreendimento ?? null,
      canal ?? null,
      String(idlead),
      fields.cvcrm_status ?? null,
      fields.cvcrm_situation ?? null,
      fields.cvcrm_stage ?? null,
      fields.cvcrm_is_sold ?? false,
      fields.cvcrm_last_update ?? null,
      JSON.stringify(cvcrmLead ?? {}),
    ],
  );

  const row = result.rows[0];
  return {
    count: result.rowCount ?? 0,
    leadUuid: row?.id ?? null,
    empreendimento: row?.empreendimento ?? null,
  };
}

async function applyCvcrmLeadRouted(client, idlead, cvcrmLead) {
  const fields = parseCvcrmLeadResponse(cvcrmLead);
  const sourceTable = await resolveLeadSourceTable(client, idlead);
  const fallbackName = toSafeString(cvcrmLead.nome) || toSafeString(cvcrmLead.name) || null;

  if (sourceTable) {
    if (!(await tableExists(client, sourceTable))) {
      throw new Error(`Tabela-fonte ${sourceTable} não existe no Neon`);
    }

    const current = await fetchCurrentAuditValues(client, sourceTable, idlead);
    const changes = computeAuditChanges(current ?? {}, fields, false);
    const leadName =
      toSafeString(current?.nome) || toSafeString(current?.name) || fallbackName;

    const updateResult = await updateLeadTable(client, sourceTable, idlead, fields, cvcrmLead);
    if (updateResult.count === 0) {
      throw new Error(
        `Nenhum registro com cvcrm_lead_id=${idlead} em ${sourceTable}`,
      );
    }

    await logCvcrmLeadUpdate(client, {
      idlead,
      cvcrmLeadId: String(idlead),
      leadName,
      sourceTable,
      action: 'update',
      changes,
    });

    return {
      action: 'update',
      table: sourceTable,
      leadUuid: updateResult.leadUuid,
      empreendimento: updateResult.empreendimento,
      fields,
    };
  }

  const targetTable = 'leads_cvcrm';
  const current = await fetchCurrentAuditValues(client, targetTable, idlead);
  const isNewInsert = current === null;
  const action = isNewInsert ? 'insert' : 'update';
  const changes = computeAuditChanges(current, fields, isNewInsert);
  const leadName =
    toSafeString(current?.nome) || toSafeString(current?.name) || fallbackName;

  const insertResult = await upsertLeadsCvcrm(client, idlead, cvcrmLead, fields);

  await logCvcrmLeadUpdate(client, {
    idlead,
    cvcrmLeadId: String(idlead),
    leadName,
    sourceTable: targetTable,
    action,
    changes,
  });

  return {
    action: isNewInsert ? 'insert' : 'update',
    table: targetTable,
    leadUuid: insertResult.leadUuid,
    empreendimento: insertResult.empreendimento,
    fields,
  };
}

async function logBatchSync(client, summary) {
  try {
    await client.query(
      `INSERT INTO cvcrm_webhook_logs (
         received_at,
         processed,
         processed_at,
         payload,
         error_message,
         event_type
       ) VALUES (
         now(),
         $1,
         now(),
         $2::jsonb,
         $3,
         'batch_sync'
       )`,
      [
        summary.errors === 0,
        JSON.stringify(summary),
        summary.errors > 0 ? `${summary.errors} erro(s) no batch` : null,
      ],
    );
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') {
      console.error('[cvcrm/batch] Erro ao gravar cvcrm_webhook_logs:', err?.message ?? err);
    }
  }
}

async function persistCvcrmSyncStatus(client, processed) {
  try {
    await client.query(
      `UPDATE cvcrm_sync_status
       SET last_sync_at = now(),
           last_processed = $1
       WHERE id = 1`,
      [processed],
    );
  } catch (err) {
    if (err?.code !== '42P01') {
      console.error('[cvcrm/batch] Erro ao gravar cvcrm_sync_status:', err?.message ?? err);
    }
  }
}

export async function getCvcrmSyncStatus() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { last_sync_at: null, last_processed: 0 };
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT last_sync_at, last_processed FROM cvcrm_sync_status WHERE id = 1`,
    );
    if (result.rowCount === 0) {
      return { last_sync_at: null, last_processed: 0 };
    }
    const row = result.rows[0];
    return {
      last_sync_at: row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
      last_processed: Number(row.last_processed) || 0,
    };
  } catch (err) {
    if (err?.code === '42P01') {
      return { last_sync_at: null, last_processed: 0 };
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function listCvcrmLeadUpdates(limit = 100, offset = 0) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return { updates: [] };

  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT id, idlead, cvcrm_lead_id, lead_name, source_table, action, changes, synced_at
       FROM cvcrm_lead_updates
       ORDER BY synced_at DESC
       LIMIT $1 OFFSET $2`,
      [safeLimit, safeOffset],
    );
    return {
      updates: result.rows.map((row) => ({
        ...row,
        synced_at: row.synced_at ? new Date(row.synced_at).toISOString() : null,
      })),
    };
  } catch (err) {
    if (err?.code === '42P01') return { updates: [] };
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getCvcrmLeadUpdatesCount() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return 0;

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM cvcrm_lead_updates`);
    return result.rows[0]?.count ?? 0;
  } catch (err) {
    if (err?.code === '42P01') return 0;
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getCvcrmPendingCount() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return 0;

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT COUNT(*)::int AS pending FROM cvcrm_pending_updates`,
    );
    return result.rows[0]?.pending ?? 0;
  } catch (err) {
    if (err?.code === '42P01') return 0;
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function enqueueCvcrmPendingUpdate(idlead) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO cvcrm_pending_updates (idlead)
       VALUES ($1)
       ON CONFLICT (idlead) DO UPDATE SET received_at = now()`,
      [toLeadIdNumber(idlead)],
    );
  } finally {
    await client.end().catch(() => {});
  }
}

export async function syncPendingLeads({ skipThrottle = false } = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { processed: 0, not_found: 0, errors: 1, total_baixados: 0, message: 'Neon não configurado' };
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();

    const pendingResult = await client.query(
      `SELECT idlead FROM cvcrm_pending_updates ORDER BY received_at ASC`,
    );
    const pendingIds = pendingResult.rows.map((row) => String(row.idlead));

    if (pendingIds.length === 0) {
      return {
        processed: 0,
        not_found: 0,
        errors: 0,
        total_baixados: 0,
        message: 'fila vazia',
      };
    }

    if (!skipThrottle) {
      if (batchSyncInFlight) {
        return {
          processed: 0,
          not_found: 0,
          errors: 0,
          total_baixados: 0,
          skipped: true,
          message: 'Sincronização em andamento, aguarde',
        };
      }
      if (Date.now() - lastBatchSyncAt < BATCH_SYNC_MIN_INTERVAL_MS) {
        return {
          processed: 0,
          not_found: 0,
          errors: 0,
          total_baixados: 0,
          skipped: true,
          message: 'Sincronização recente, aguarde',
        };
      }
    } else if (batchSyncInFlight) {
      return {
        processed: 0,
        not_found: 0,
        errors: 0,
        total_baixados: 0,
        skipped: true,
        message: 'Sincronização em andamento, aguarde',
      };
    }

    batchSyncInFlight = true;
    lastBatchSyncAt = Date.now();

    let processed = 0;
    let not_found = 0;
    let errors = 0;

    const allLeads = await fetchAllCvdwLeadsToday();
    const leadsById = new Map(allLeads.map((lead) => [String(lead.idlead), lead]));

    for (const idlead of pendingIds) {
      const cvcrmLead = leadsById.get(idlead) ?? null;
      if (!cvcrmLead) {
        not_found += 1;
        await client.query(
          `UPDATE cvcrm_pending_updates
           SET attempts = attempts + 1,
               last_error = $2
           WHERE idlead = $1`,
          [toLeadIdNumber(idlead), 'Lead não encontrado na lista do dia no CVDW'],
        );
        continue;
      }

      try {
        const routed = await applyCvcrmLeadRouted(client, idlead, cvcrmLead);

        await client.query(`DELETE FROM cvcrm_pending_updates WHERE idlead = $1`, [
          toLeadIdNumber(idlead),
        ]);
        processed += 1;
        console.log(
          `[cvcrm/batch] idlead=${idlead} → ${routed.action} em ${routed.table}`,
        );
      } catch (err) {
        errors += 1;
        const message = err instanceof Error ? err.message : String(err);
        await client.query(
          `UPDATE cvcrm_pending_updates
           SET attempts = attempts + 1,
               last_error = $2
           WHERE idlead = $1`,
          [toLeadIdNumber(idlead), message],
        );
        console.error(`[cvcrm/batch] Erro ao processar idlead=${idlead}:`, message);
      }
    }

    const summary = {
      processed,
      not_found,
      errors,
      total_baixados: allLeads.length,
      pending_inicial: pendingIds.length,
    };

    await logBatchSync(client, summary);
    await persistCvcrmSyncStatus(client, processed);

    if (processed > 0) {
      try {
        const syncResult = await syncLeadsFromSources({ force: true });
        console.log(
          `[cvcrm/batch] leads_* → leads: ${syncResult.synced} sincronizado(s)`,
        );
      } catch (err) {
        console.error('[cvcrm/batch] Falha ao sincronizar leads unificados:', err?.message ?? err);
      }
    }

    console.log(
      `[cvcrm/batch] concluído: processed=${processed}, not_found=${not_found}, errors=${errors}, total_baixados=${allLeads.length}`,
    );

    return summary;
  } finally {
    batchSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

export async function syncAllChangedToday() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { processed: 0, total_baixados: 0, errors: 1, message: 'Neon não configurado' };
  }

  if (batchSyncInFlight) {
    return {
      processed: 0,
      total_baixados: 0,
      skipped: true,
      message: 'Sincronização em andamento, aguarde',
    };
  }

  batchSyncInFlight = true;
  lastBatchSyncAt = Date.now();

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();

    const allLeads = await fetchAllCvdwLeadsToday();
    let processed = 0;
    let errors = 0;

    for (const cvcrmLead of allLeads) {
      const idlead = String(cvcrmLead?.idlead ?? '');
      if (!idlead) {
        errors += 1;
        continue;
      }

      try {
        const routed = await applyCvcrmLeadRouted(client, idlead, cvcrmLead);
        processed += 1;
        console.log(
          `[cvcrm/batch-all] idlead=${idlead} → ${routed.action} em ${routed.table}`,
        );
      } catch (err) {
        errors += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[cvcrm/batch-all] Erro ao processar idlead=${idlead}:`, message);
      }
    }

    const summary = {
      processed,
      total_baixados: allLeads.length,
      errors,
      sync_type: 'all_changed_today',
    };

    await logBatchSync(client, summary);
    await persistCvcrmSyncStatus(client, processed);

    if (processed > 0) {
      try {
        const syncResult = await syncLeadsFromSources({ force: true });
        console.log(
          `[cvcrm/batch-all] leads_* → leads: ${syncResult.synced} sincronizado(s)`,
        );
      } catch (err) {
        console.error('[cvcrm/batch-all] Falha ao sincronizar leads unificados:', err?.message ?? err);
      }
    }

    console.log(
      `[cvcrm/batch-all] concluído: processed=${processed}, total_baixados=${allLeads.length}, errors=${errors}`,
    );

    return { processed, total_baixados: allLeads.length, errors };
  } finally {
    batchSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

function scheduleDailyBatchSync() {
  setInterval(() => {
    const brt = brtNowParts();
    if (
      brt.hour === DAILY_SYNC_HOUR &&
      brt.minute === DAILY_SYNC_MINUTE &&
      lastDailySyncDate !== brt.date
    ) {
      lastDailySyncDate = brt.date;
      console.log(
        '[cvcrm/batch] Job diário 23:59 BRT — leads, reservas, corretores, imobiliárias',
      );
      syncPendingLeads({ skipThrottle: true })
        .then(async () => {
          const { syncPendingReservas } = await import('./cvcrmReservasSync.mjs');
          return syncPendingReservas({ skipThrottle: true });
        })
        .then(async () => {
          const { syncCorretores, syncImobiliarias } = await import('./cvcrmCadastrosSync.mjs');
          await syncCorretores();
          return syncImobiliarias();
        })
        .catch((err) => {
          console.error('[cvcrm/batch] Job diário falhou:', err?.message ?? err);
        });
    }
  }, 60_000);
}

scheduleDailyBatchSync();
