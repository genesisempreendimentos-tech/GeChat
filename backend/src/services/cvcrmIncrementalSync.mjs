import pg from 'pg';
import { syncLeadsFromSources } from './leadSourceSync.mjs';
import {
  applyCvcrmLeadRouted,
  drainPendingLeadsUpdates,
  getCvcrmCredentials,
  getCvcrmSyncStatus,
  getNeonLeadsUrl,
} from './cvcrmBatchSync.mjs';
import {
  applyCvdwReservaIncremental,
  flushReservaAttributionQueue,
} from './cvcrmReservasSync.mjs';

const CVCRM_CVDW_LEADS_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/leads';
const CVCRM_CVDW_RESERVAS_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/reservas';
const CVDW_PAGE_SIZE = 500;

const INCREMENTAL_MIN_INTERVAL_MS = 60_000;
const INCREMENTAL_INTERVAL_MS = 15 * 60 * 1000;
const CURSOR_BUFFER_MS = 10 * 60 * 1000;
const FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const SWEEP_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const MOUNT_SKIP_IF_RECENT_MS = 2 * 60 * 1000;

const DAILY_SWEEP_HOUR = 4;
const DAILY_SWEEP_MINUTE = 0;

let incrementalSyncInFlight = false;
let lastIncrementalSyncAt = 0;
let lastDailySweepDate = null;

/** Formato aceito pelo CVDW: YYYY-MM-DD HH:mm:ss em America/Sao_Paulo. */
export function brtTimestamp(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const hour = String(Number(p.hour) % 24).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}:${p.second}`;
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
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}

function resolveSinceUtc(cursorAt, runStart, { sweep48h = false } = {}) {
  if (sweep48h) {
    return new Date(runStart.getTime() - SWEEP_LOOKBACK_MS);
  }
  if (cursorAt) {
    return new Date(new Date(cursorAt).getTime() - CURSOR_BUFFER_MS);
  }
  return new Date(runStart.getTime() - FIRST_RUN_LOOKBACK_MS);
}

async function cvcrmApiRequest(url) {
  const { email, token } = getCvcrmCredentials();
  if (!email || !token) {
    throw new Error('CVCRM_EMAIL e CVCRM_TOKEN não configurados.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', email, token },
  });

  const text = await res.text();
  if (res.status < 200 || res.status >= 300) {
    throw new Error(
      `CVCRM CVDW indisponível: GET → ${res.status} (${text?.slice(0, 500) || 'sem body'})`,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function fetchCvdwSince(baseUrl, sinceBrt) {
  const allRows = [];
  let pagina = 1;
  let totalPages = 1;

  while (pagina <= totalPages) {
    const pageParams = new URLSearchParams({
      registros_por_pagina: String(CVDW_PAGE_SIZE),
      pagina: String(pagina),
    });
    const url = `${baseUrl}?a_partir_data_referencia=${encodeURIComponent(sinceBrt)}&${pageParams}`;
    const pageData = await cvcrmApiRequest(url);
    const dados = Array.isArray(pageData.dados) ? pageData.dados : [];
    allRows.push(...dados);
    totalPages = Number(pageData.total_de_paginas) || 1;
    pagina += 1;
  }

  return allRows;
}

async function getSyncCursor(client, entity) {
  const result = await client.query(
    `SELECT last_sync_at FROM cvcrm_sync_cursors WHERE entity = $1`,
    [entity],
  );
  const raw = result.rows[0]?.last_sync_at;
  return raw ? new Date(raw) : null;
}

async function setSyncCursor(client, entity, runStart) {
  await client.query(
    `INSERT INTO cvcrm_sync_cursors (entity, last_sync_at)
     VALUES ($1, $2)
     ON CONFLICT (entity) DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at`,
    [entity, runStart],
  );
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
      console.error('[cvcrm/incremental] Erro ao gravar cvcrm_sync_status:', err?.message ?? err);
    }
  }
}

export async function getSyncCursors() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return { leads: null, reservas: null };

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `SELECT entity, last_sync_at FROM cvcrm_sync_cursors ORDER BY entity`,
    );
    const out = { leads: null, reservas: null };
    for (const row of result.rows) {
      const iso = row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null;
      if (row.entity === 'leads') out.leads = iso;
      if (row.entity === 'reservas') out.reservas = iso;
    }
    return out;
  } catch (err) {
    if (err?.code === '42P01') return { leads: null, reservas: null };
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function syncLeadsIncremental(client, { runStart, sweep48h = false } = {}) {
  const cursorAt = await getSyncCursor(client, 'leads');
  const sinceUtc = resolveSinceUtc(cursorAt, runStart, { sweep48h });
  const sinceBrt = brtTimestamp(sinceUtc);

  const allLeads = await fetchCvdwSince(CVCRM_CVDW_LEADS_URL, sinceBrt);
  let processed = 0;
  let errors = 0;

  for (const cvcrmLead of allLeads) {
    const idlead = String(cvcrmLead?.idlead ?? '').trim();
    if (!idlead) continue;

    try {
      await applyCvcrmLeadRouted(client, idlead, cvcrmLead);
      processed += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `[cvcrm/incremental/leads] Erro idlead=${idlead}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  await setSyncCursor(client, 'leads', runStart);

  console.log(
    `[cvcrm/incremental/leads] since_brt=${sinceBrt} processed=${processed} total_baixados=${allLeads.length} errors=${errors}`,
  );

  return {
    processed,
    errors,
    total_baixados: allLeads.length,
    since_brt: sinceBrt,
    cursor_before: cursorAt ? cursorAt.toISOString() : null,
    cursor_after: runStart.toISOString(),
  };
}

export async function syncReservasIncremental(client, { runStart, sweep48h = false } = {}) {
  const cursorAt = await getSyncCursor(client, 'reservas');
  const sinceUtc = resolveSinceUtc(cursorAt, runStart, { sweep48h });
  const sinceBrt = brtTimestamp(sinceUtc);

  const allReservas = await fetchCvdwSince(CVCRM_CVDW_RESERVAS_URL, sinceBrt);
  let processed = 0;
  let errors = 0;
  let leads_updated = 0;
  const attributionQueue = [];

  for (const raw of allReservas) {
    try {
      const result = await applyCvdwReservaIncremental(client, raw);
      processed += 1;
      leads_updated += result.leads_updated;
      attributionQueue.push(...result.attributionQueue);
    } catch (err) {
      errors += 1;
      const idreserva = raw?.idreserva ?? '?';
      console.error(
        `[cvcrm/incremental/reservas] Erro idreserva=${idreserva}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  await setSyncCursor(client, 'reservas', runStart);

  console.log(
    `[cvcrm/incremental/reservas] since_brt=${sinceBrt} processed=${processed} total_baixados=${allReservas.length} errors=${errors}`,
  );

  return {
    processed,
    errors,
    total_baixados: allReservas.length,
    leads_updated,
    attributionQueue,
    since_brt: sinceBrt,
    cursor_before: cursorAt ? cursorAt.toISOString() : null,
    cursor_after: runStart.toISOString(),
  };
}

export async function runIncrementalSync({
  skipThrottle = false,
  skipIfRecentMs = 0,
  sweep48h = false,
} = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return {
      processed: 0,
      errors: 1,
      message: 'Neon não configurado',
      leads: null,
      reservas: null,
    };
  }

  if (skipIfRecentMs > 0) {
    const status = await getCvcrmSyncStatus();
    if (status.last_sync_at) {
      const elapsed = Date.now() - new Date(status.last_sync_at).getTime();
      if (elapsed < skipIfRecentMs) {
        return {
          processed: 0,
          skipped: true,
          message: 'Sincronização recente, usando cache',
          leads: { processed: 0 },
          reservas: { processed: 0 },
        };
      }
    }
  }

  if (!skipThrottle) {
    if (incrementalSyncInFlight) {
      return {
        processed: 0,
        skipped: true,
        message: 'Sincronização incremental em andamento',
        leads: { processed: 0 },
        reservas: { processed: 0 },
      };
    }
    if (Date.now() - lastIncrementalSyncAt < INCREMENTAL_MIN_INTERVAL_MS) {
      return {
        processed: 0,
        skipped: true,
        message: 'Sincronização recente, aguarde',
        leads: { processed: 0 },
        reservas: { processed: 0 },
      };
    }
  } else if (incrementalSyncInFlight) {
    return {
      processed: 0,
      skipped: true,
      message: 'Sincronização incremental em andamento',
      leads: { processed: 0 },
      reservas: { processed: 0 },
    };
  }

  incrementalSyncInFlight = true;
  lastIncrementalSyncAt = Date.now();
  const runStart = new Date();

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

  try {
    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS cvcrm_sync_cursors (
        entity TEXT PRIMARY KEY,
        last_sync_at TIMESTAMPTZ
      )
    `);
    await client.query(
      `INSERT INTO cvcrm_sync_cursors (entity) VALUES ('leads'), ('reservas')
       ON CONFLICT (entity) DO NOTHING`,
    );

    const leadsResult = await syncLeadsIncremental(client, { runStart, sweep48h });
    const reservasResult = await syncReservasIncremental(client, { runStart, sweep48h });

    const needsConsolidation = leadsResult.processed > 0 || reservasResult.processed > 0;
    let leads_consolidated = 0;
    let attribution_updated = 0;

    if (needsConsolidation) {
      try {
        const syncResult = await syncLeadsFromSources({ force: true });
        leads_consolidated = syncResult.synced ?? 0;
        console.log(`[cvcrm/incremental] fontes → all_leads: ${leads_consolidated} sincronizado(s)`);
      } catch (err) {
        console.error('[cvcrm/incremental] Falha ao consolidar leads:', err?.message ?? err);
      }

      if (reservasResult.attributionQueue?.length) {
        attribution_updated = await flushReservaAttributionQueue(
          client,
          reservasResult.attributionQueue,
        );
      }
    }

    await persistCvcrmSyncStatus(client, leadsResult.processed);

    const cursorRows = await client.query(
      `SELECT entity, last_sync_at FROM cvcrm_sync_cursors ORDER BY entity`,
    );
    const cursors = { leads: null, reservas: null };
    for (const row of cursorRows.rows) {
      const iso = row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null;
      if (row.entity === 'leads') cursors.leads = iso;
      if (row.entity === 'reservas') cursors.reservas = iso;
    }

    const summary = {
      processed: leadsResult.processed,
      reservas_processed: reservasResult.processed,
      errors: leadsResult.errors + reservasResult.errors,
      leads_updated_from_reservas: reservasResult.leads_updated,
      attribution_updated,
      leads_consolidated,
      sweep48h,
      run_start: runStart.toISOString(),
      leads: leadsResult,
      reservas: {
        ...reservasResult,
        attributionQueue: undefined,
      },
      cursors,
    };

    try {
      const pendingDrain = await drainPendingLeadsUpdates();
      if ((pendingDrain.processed ?? 0) > 0) {
        summary.pending_drain = {
          processed: pendingDrain.processed,
          not_found: pendingDrain.not_found,
          errors: pendingDrain.errors,
        };
        console.log(
          `[cvcrm/incremental] pending_updates: processed=${pendingDrain.processed}`,
        );
      }
    } catch (err) {
      console.error(
        '[cvcrm/incremental] Falha ao drenar cvcrm_pending_updates:',
        err instanceof Error ? err.message : String(err),
      );
    }

    console.log(
      `[cvcrm/incremental] concluído: leads=${leadsResult.processed}, reservas=${reservasResult.processed}, errors=${summary.errors}`,
    );

    return summary;
  } finally {
    incrementalSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

function scheduleIncrementalSync() {
  setInterval(() => {
    runIncrementalSync().catch((err) => {
      console.error('[cvcrm/incremental] Job 15min falhou:', err?.message ?? err);
    });
  }, INCREMENTAL_INTERVAL_MS);

  setInterval(() => {
    const brt = brtNowParts();
    if (
      brt.hour === DAILY_SWEEP_HOUR &&
      brt.minute === DAILY_SWEEP_MINUTE &&
      lastDailySweepDate !== brt.date
    ) {
      lastDailySweepDate = brt.date;
      console.log('[cvcrm/incremental] Sweep diário 04:00 BRT — janela 48h');
      runIncrementalSync({ skipThrottle: true, sweep48h: true })
        .then(async () => {
          const { syncCorretores, syncImobiliarias } = await import('./cvcrmCadastrosSync.mjs');
          await syncCorretores();
          return syncImobiliarias();
        })
        .catch((err) => {
          console.error('[cvcrm/incremental] Sweep diário falhou:', err?.message ?? err);
        });
    }
  }, 60_000);

  console.log('[cvcrm/incremental] Scheduler ativo: a cada 15min + sweep 04:00 BRT');
}

scheduleIncrementalSync();

export { MOUNT_SKIP_IF_RECENT_MS };
