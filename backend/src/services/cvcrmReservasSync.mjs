import pg from 'pg';
import {
  getCvcrmCredentials,
  getNeonLeadsUrl,
  resolveLeadSourceTable,
  todayReferenceDate,
  VALID_SOURCE_TABLES_SET,
} from './cvcrmBatchSync.mjs';
import { syncLeadsFromSources } from './leadSourceSync.mjs';

const CVCRM_CVDW_RESERVAS_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/reservas';
const CVDW_PAGE_SIZE = 500;
const RESERVAS_SYNC_MIN_INTERVAL_MS = 30_000;

const TABLES_WITH_UPDATED_AT = new Set(['leads_solar_bosque', 'leads_cvcrm']);

let reservasSyncInFlight = false;
let lastReservasSyncAt = 0;

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function toReservaIdNumber(idreserva) {
  const n = Number(idreserva);
  return Number.isFinite(n) ? n : idreserva;
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseCvcrmTimestamp(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const raw = String(value).trim();
  if (!raw) return null;
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}-03:00`;
  const d = new Date(withTz);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeBooleanToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

/** Aceita boolean, "Sim"/"Não" (CVCRM), S/N e variantes comuns. */
export function parseBooleanFlag(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const s = normalizeBooleanToken(value);
  if (['sim', 's', 'y', 'yes', 'true', '1'].includes(s)) return true;
  if (['nao', 'n', 'no', 'false', '0'].includes(s)) return false;
  return null;
}

function resolveReferenceDate(referenceDate) {
  const ref = toSafeString(referenceDate);
  if (!ref) return todayReferenceDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    throw new Error('referenceDate inválida; use AAAA-MM-DD');
  }
  return ref;
}

export function splitIdleadIds(idlead) {
  const raw = toSafeString(idlead);
  if (!raw) return [];
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}

export function parseCvdwReservaRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const situacao = toSafeString(raw.situacao) || null;
  const aprovada = parseBooleanFlag(raw.aprovada);
  return {
    idreserva: toReservaIdNumber(raw.idreserva),
    idlead: toSafeString(raw.idlead) || null,
    idcliente: toSafeString(raw.idcliente) || null,
    idcorretor: toSafeString(raw.idcorretor) || null,
    idimobiliaria: toSafeString(raw.idimobiliaria) || null,
    situacao,
    situacao_comercial: toSafeString(raw.situacao_comercial) || null,
    valor_contrato: parseNumeric(raw.valor_contrato),
    valor_proposta: parseNumeric(raw.valor_proposta),
    unidade: toSafeString(raw.unidade) || null,
    bloco: toSafeString(raw.bloco) || null,
    empreendimento: toSafeString(raw.empreendimento) || null,
    data_venda: parseCvcrmTimestamp(raw.data_venda),
    data_contrato: parseCvcrmTimestamp(raw.data_contrato),
    data_aprovacao: parseCvcrmTimestamp(raw.data_aprovacao),
    aprovada,
    numero_venda: toSafeString(raw.numero_venda) || null,
    usuario_aprovacao: toSafeString(raw.usuario_aprovacao) || null,
    nome_usuario: toSafeString(raw.nome_usuario) || null,
    motivo_cancelamento: toSafeString(raw.motivo_cancelamento) || null,
    payload: raw,
  };
}

export function isReservaSaleIndicated(parsed) {
  if (!parsed) return false;
  const sit = String(parsed.situacao ?? '').toLowerCase();
  if (sit.includes('vendida')) return true;
  if (parsed.aprovada === true) return true;
  return false;
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
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `CVCRM CVDW reservas indisponível: ${method} → ${res.status} (${text?.slice(0, 500) || 'sem body'})`,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function fetchCvdwReservasPage(pagina, referenceDate) {
  const params = new URLSearchParams({
    a_partir_data_referencia: referenceDate,
    registros_por_pagina: String(CVDW_PAGE_SIZE),
    pagina: String(pagina),
  });
  return cvcrmApiRequest('GET', `${CVCRM_CVDW_RESERVAS_URL}?${params}`);
}

export async function fetchAllCvdwReservasToday({ referenceDate } = {}) {
  const refDate = resolveReferenceDate(referenceDate);
  const allReservas = [];
  let pagina = 1;
  let totalPages = 1;

  while (pagina <= totalPages) {
    const pageData = await fetchCvdwReservasPage(pagina, refDate);
    const dados = Array.isArray(pageData.dados) ? pageData.dados : [];
    allReservas.push(...dados);
    totalPages = Number(pageData.total_de_paginas) || 1;
    pagina += 1;
  }

  return allReservas;
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName],
  );
  return result.rowCount > 0;
}

function assertValidSourceTable(tableName) {
  if (!VALID_SOURCE_TABLES_SET.has(tableName)) {
    throw new Error(`Tabela-fonte não permitida: ${tableName}`);
  }
}

async function upsertCvcrmReserva(client, parsed) {
  await client.query(
    `INSERT INTO cvcrm_reservas (
       idreserva,
       idlead,
       idcliente,
       idcorretor,
       idimobiliaria,
       situacao,
       situacao_comercial,
       valor_contrato,
       valor_proposta,
       unidade,
       bloco,
       empreendimento,
       data_venda,
       data_contrato,
       data_aprovacao,
       aprovada,
       numero_venda,
       usuario_aprovacao,
       nome_usuario,
       motivo_cancelamento,
       payload,
       last_synced_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13::timestamptz, $14::timestamptz, $15::timestamptz,
       $16, $17, $18, $19, $20, $21::jsonb, now()
     )
     ON CONFLICT (idreserva) DO UPDATE SET
       idlead = EXCLUDED.idlead,
       idcliente = EXCLUDED.idcliente,
       idcorretor = EXCLUDED.idcorretor,
       idimobiliaria = EXCLUDED.idimobiliaria,
       situacao = EXCLUDED.situacao,
       situacao_comercial = EXCLUDED.situacao_comercial,
       valor_contrato = EXCLUDED.valor_contrato,
       valor_proposta = EXCLUDED.valor_proposta,
       unidade = EXCLUDED.unidade,
       bloco = EXCLUDED.bloco,
       empreendimento = EXCLUDED.empreendimento,
       data_venda = EXCLUDED.data_venda,
       data_contrato = EXCLUDED.data_contrato,
       data_aprovacao = EXCLUDED.data_aprovacao,
       aprovada = EXCLUDED.aprovada,
       numero_venda = EXCLUDED.numero_venda,
       usuario_aprovacao = EXCLUDED.usuario_aprovacao,
       nome_usuario = EXCLUDED.nome_usuario,
       motivo_cancelamento = EXCLUDED.motivo_cancelamento,
       payload = EXCLUDED.payload,
       last_synced_at = now()`,
    [
      parsed.idreserva,
      parsed.idlead,
      parsed.idcliente,
      parsed.idcorretor,
      parsed.idimobiliaria,
      parsed.situacao,
      parsed.situacao_comercial,
      parsed.valor_contrato,
      parsed.valor_proposta,
      parsed.unidade,
      parsed.bloco,
      parsed.empreendimento,
      parsed.data_venda,
      parsed.data_contrato,
      parsed.data_aprovacao,
      parsed.aprovada,
      parsed.numero_venda,
      parsed.usuario_aprovacao,
      parsed.nome_usuario,
      parsed.motivo_cancelamento,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

async function updateLeadSaleFromReserva(client, idlead, parsed) {
  if (!isReservaSaleIndicated(parsed)) {
    return { updated: false, reason: 'reserva sem indicação de venda' };
  }

  const sourceTable = await resolveLeadSourceTable(client, idlead);
  if (!sourceTable) {
    return { updated: false, reason: 'lead não encontrado no Neon' };
  }

  assertValidSourceTable(sourceTable);

  const saleValue = parsed.valor_contrato ?? parsed.valor_proposta ?? null;
  const saleDate = parsed.data_venda ?? null;

  const setClauses = [];
  const params = [];
  let idx = 1;

  if (saleValue != null && (await columnExists(client, sourceTable, 'cvcrm_sale_value'))) {
    setClauses.push(`cvcrm_sale_value = $${idx++}`);
    params.push(saleValue);
  }
  if (saleDate != null && (await columnExists(client, sourceTable, 'cvcrm_sale_date'))) {
    setClauses.push(`cvcrm_sale_date = $${idx++}::timestamptz`);
    params.push(saleDate);
  }
  if (await columnExists(client, sourceTable, 'cvcrm_is_sold')) {
    setClauses.push(`cvcrm_is_sold = $${idx++}`);
    params.push(true);
  }
  if (await columnExists(client, sourceTable, 'cvcrm_sync_status')) {
    setClauses.push("cvcrm_sync_status = 'synced'");
  }
  if (TABLES_WITH_UPDATED_AT.has(sourceTable)) {
    setClauses.push('updated_at = now()');
  }

  if (setClauses.length === 0) {
    return { updated: false, reason: 'nenhuma coluna de venda na tabela-fonte' };
  }

  params.push(String(idlead));
  const result = await client.query(
    `UPDATE ${sourceTable}
     SET ${setClauses.join(', ')}
     WHERE cvcrm_lead_id = $${idx}`,
    params,
  );

  return {
    updated: (result.rowCount ?? 0) > 0,
    table: sourceTable,
  };
}

/** Atribuição autoritativa de venda na tabela unificada `leads` (sem alterar fontes). */
async function applyReservaAttributionToLead(client, idlead, parsed) {
  if (!isReservaSaleIndicated(parsed)) return false;

  const idcorretor = parsed.idcorretor ?? null;
  const idimobiliaria = parsed.idimobiliaria ?? null;
  if (!idcorretor && !idimobiliaria) return false;

  const result = await client.query(
    `UPDATE leads
     SET idcorretor = COALESCE($1, idcorretor),
         idimobiliaria = COALESCE($2, idimobiliaria),
         updated_at = now()
     WHERE cvcrm_lead_id = $3`,
    [idcorretor, idimobiliaria, String(idlead)],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function getCvcrmReservasPendingCount() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return 0;

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT COUNT(*)::int AS pending FROM cvcrm_pending_reservas`,
    );
    return result.rows[0]?.pending ?? 0;
  } catch (err) {
    if (err?.code === '42P01') return 0;
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function enqueueCvcrmPendingReserva(idreserva) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO cvcrm_pending_reservas (idreserva)
       VALUES ($1)
       ON CONFLICT (idreserva) DO UPDATE SET received_at = now()`,
      [toReservaIdNumber(idreserva)],
    );
  } finally {
    await client.end().catch(() => {});
  }
}

export async function syncPendingReservas({ skipThrottle = false, referenceDate } = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { processed: 0, not_found: 0, errors: 1, total_baixados: 0, message: 'Neon não configurado' };
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();

    const pendingResult = await client.query(
      `SELECT idreserva FROM cvcrm_pending_reservas ORDER BY received_at ASC`,
    );
    const pendingIds = pendingResult.rows.map((row) => String(row.idreserva));

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
      if (reservasSyncInFlight) {
        return {
          processed: 0,
          not_found: 0,
          errors: 0,
          total_baixados: 0,
          skipped: true,
          message: 'Sincronização de reservas em andamento, aguarde',
        };
      }
      if (Date.now() - lastReservasSyncAt < RESERVAS_SYNC_MIN_INTERVAL_MS) {
        return {
          processed: 0,
          not_found: 0,
          errors: 0,
          total_baixados: 0,
          skipped: true,
          message: 'Sincronização recente, aguarde',
        };
      }
    } else if (reservasSyncInFlight) {
      return {
        processed: 0,
        not_found: 0,
        errors: 0,
        total_baixados: 0,
        skipped: true,
        message: 'Sincronização de reservas em andamento, aguarde',
      };
    }

    reservasSyncInFlight = true;
    lastReservasSyncAt = Date.now();

    const refDate = resolveReferenceDate(referenceDate);
    let processed = 0;
    let not_found = 0;
    let errors = 0;
    let leads_updated = 0;
    let attribution_updated = 0;
    const attributionQueue = [];

    const allReservas = await fetchAllCvdwReservasToday({ referenceDate: refDate });
    const reservasById = new Map(allReservas.map((r) => [String(r.idreserva), r]));

    for (const idreserva of pendingIds) {
      const raw = reservasById.get(idreserva) ?? null;
      if (!raw) {
        not_found += 1;
        await client.query(
          `UPDATE cvcrm_pending_reservas
           SET attempts = attempts + 1,
               last_error = $2
           WHERE idreserva = $1`,
          [
            toReservaIdNumber(idreserva),
            `Reserva não encontrada no CVDW para a_partir_data_referencia=${refDate}`,
          ],
        );
        continue;
      }

      try {
        const parsed = parseCvdwReservaRow(raw);
        if (!parsed?.idreserva) {
          throw new Error('idreserva inválido no payload CVDW');
        }

        await upsertCvcrmReserva(client, parsed);

        for (const idlead of splitIdleadIds(parsed.idlead)) {
          const leadUpdate = await updateLeadSaleFromReserva(client, idlead, parsed);
          if (leadUpdate.updated) leads_updated += 1;
          if (isReservaSaleIndicated(parsed)) {
            attributionQueue.push({ idlead, parsed });
          }
        }

        await client.query(`DELETE FROM cvcrm_pending_reservas WHERE idreserva = $1`, [
          toReservaIdNumber(idreserva),
        ]);
        processed += 1;
        console.log(
          `[cvcrm/reservas] idreserva=${idreserva} idlead=${parsed.idlead ?? '—'} gravada em cvcrm_reservas`,
        );
      } catch (err) {
        errors += 1;
        const message = err instanceof Error ? err.message : String(err);
        await client.query(
          `UPDATE cvcrm_pending_reservas
           SET attempts = attempts + 1,
               last_error = $2
           WHERE idreserva = $1`,
          [toReservaIdNumber(idreserva), message],
        );
        console.error(`[cvcrm/reservas] Erro ao processar idreserva=${idreserva}:`, message);
      }
    }

    const summary = {
      processed,
      not_found,
      errors,
      total_baixados: allReservas.length,
      leads_updated,
      attribution_updated,
      pending_inicial: pendingIds.length,
      reference_date: refDate,
    };

    if (processed > 0) {
      try {
        const syncResult = await syncLeadsFromSources({ force: true });
        console.log(
          `[cvcrm/reservas] leads_* → leads: ${syncResult.synced} sincronizado(s)`,
        );
      } catch (err) {
        console.error('[cvcrm/reservas] Falha ao consolidar leads:', err?.message ?? err);
      }

      for (const { idlead, parsed } of attributionQueue) {
        try {
          if (await applyReservaAttributionToLead(client, idlead, parsed)) {
            attribution_updated += 1;
          }
        } catch (err) {
          console.error(
            `[cvcrm/reservas] Falha ao atribuir corretor/imobiliária idlead=${idlead}:`,
            err?.message ?? err,
          );
        }
      }
      summary.attribution_updated = attribution_updated;
    }

    console.log(
      `[cvcrm/reservas] concluído: processed=${processed}, not_found=${not_found}, errors=${errors}, leads_updated=${leads_updated}, attribution_updated=${attribution_updated}`,
    );

    return summary;
  } finally {
    reservasSyncInFlight = false;
    await client.end().catch(() => {});
  }
}
