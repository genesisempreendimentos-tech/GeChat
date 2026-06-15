import {
  applyCvcrmLeadRouted,
  enrichCvcrmLeadAttribution,
  getNeonLeadsUrl,
  resolveLeadSourceTable,
  sweepCvdwLeadsSince,
} from './cvcrmBatchSync.mjs';
import { syncLeadsFromSources } from './leadSourceSync.mjs';

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function splitIdleadIds(idlead) {
  const raw = toSafeString(idlead);
  if (!raw) return [];
  return [...new Set(raw.split(',').map((id) => id.trim()).filter(Boolean))];
}

/** idleads distintos presentes em cvcrm_reservas (qualquer situação). */
export async function loadImportantIdleadSet(client) {
  const { rows } = await client.query(
    `SELECT idlead FROM cvcrm_reservas WHERE NULLIF(TRIM(idlead), '') IS NOT NULL`,
  );
  const set = new Set();
  for (const row of rows) {
    for (const idlead of splitIdleadIds(row.idlead)) {
      set.add(idlead);
    }
  }
  return set;
}

/** Melhor reserva por idlead para atribuição idcorretor/idimobiliaria. */
export async function loadReservaAttributionByIdlead(client) {
  const map = new Map();
  const { rows } = await client.query(
    `SELECT idlead, idcorretor, idimobiliaria, situacao, data_venda, last_synced_at
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
  return map;
}

export async function oldestReservaReferenceDate(client) {
  const { rows } = await client.query(
    `SELECT MIN(NULLIF(TRIM(payload->>'data_referencia'), '')) AS min_ref
     FROM cvcrm_reservas`,
  );
  const minRef = toSafeString(rows[0]?.min_ref);
  if (minRef && /^\d{4}-\d{2}-\d{2}/.test(minRef)) {
    return `${minRef.slice(0, 10)} 00:00:00`;
  }
  return '2021-01-01 00:00:00';
}

export async function backfillPescariaLeads(
  client,
  { sinceBrt = '2000-01-01 00:00:00', autoLimitSince = true } = {},
) {
  const importantSet = await loadImportantIdleadSet(client);
  const reservaByIdlead = await loadReservaAttributionByIdlead(client);

  let effectiveSince = sinceBrt;
  if (autoLimitSince) {
    effectiveSince = await oldestReservaReferenceDate(client);
    console.log(`[pescaria] since_brt ajustado pela reserva mais antiga: ${effectiveSince}`);
  }

  const beforeCvcrm = await client.query(`SELECT COUNT(*)::int AS n FROM leads_cvcrm`);
  const knownInCvcrm = await client.query(
    `SELECT cvcrm_lead_id FROM leads_cvcrm WHERE cvcrm_lead_id IS NOT NULL`,
  );
  const cvcrmLeadIdsBefore = new Set(
    knownInCvcrm.rows.map((r) => String(r.cvcrm_lead_id)),
  );

  let swept = 0;
  let ignored = 0;
  let updated_source = 0;
  let upserted_cvcrm = 0;
  let new_cvcrm = 0;
  let errors = 0;
  let important_hits = 0;

  const sweep = await sweepCvdwLeadsSince(effectiveSince, {
    onPage: async (pageLeads, { pagina, totalPages, totalDownloaded }) => {
      console.log(`[pescaria] página ${pagina}/${totalPages} — ${pageLeads.length} lead(s), total ${totalDownloaded}`);

      for (const cvcrmLead of pageLeads) {
        const idlead = String(cvcrmLead?.idlead ?? '').trim();
        if (!idlead) continue;
        swept += 1;

        if (!importantSet.has(idlead)) {
          ignored += 1;
          continue;
        }

        important_hits += 1;

        try {
          const enriched = enrichCvcrmLeadAttribution(cvcrmLead, idlead, reservaByIdlead);
          const hadSource = Boolean(await resolveLeadSourceTable(client, idlead));
          await applyCvcrmLeadRouted(client, idlead, enriched);

          if (hadSource) {
            updated_source += 1;
          } else {
            upserted_cvcrm += 1;
            if (!cvcrmLeadIdsBefore.has(idlead)) {
              new_cvcrm += 1;
              cvcrmLeadIdsBefore.add(idlead);
            }
          }
        } catch (err) {
          errors += 1;
          console.error(
            `[pescaria] erro idlead=${idlead}:`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    },
  });

  const afterCvcrm = await client.query(`SELECT COUNT(*)::int AS n FROM leads_cvcrm`);

  return {
    since_brt: effectiveSince,
    important_idleads: importantSet.size,
    swept,
    ignored,
    important_hits,
    updated_source,
    upserted_cvcrm,
    new_cvcrm,
    errors,
    leads_cvcrm_before: beforeCvcrm.rows[0]?.n ?? 0,
    leads_cvcrm_after: afterCvcrm.rows[0]?.n ?? 0,
    total_baixados: sweep.totalDownloaded,
    total_pages: sweep.totalPages,
  };
}

export async function runPescariaBackfill(options = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  }

  const pg = (await import('pg')).default;
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    const backfill = await backfillPescariaLeads(client, options);
    console.log('[pescaria] syncLeadsFromSources...');
    const syncResult = await syncLeadsFromSources({ force: true });

    const counts = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM leads_cvcrm) AS leads_cvcrm,
         (SELECT COUNT(*)::int FROM all_leads) AS all_leads,
         (SELECT COUNT(*)::int FROM all_leads_unique) AS all_leads_unique`,
    );

    return {
      ...backfill,
      consolidation: syncResult,
      counts: counts.rows[0],
    };
  } finally {
    await client.end().catch(() => {});
  }
}
