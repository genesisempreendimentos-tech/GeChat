import pg from 'pg';
import { enqueueCvcrmPendingUpdate, getNeonLeadsUrl } from './cvcrmBatchSync.mjs';

export { CVCRM_WEBHOOK_TABLES, parseCvcrmLeadResponse } from './cvcrmBatchSync.mjs';

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

async function captureRawWebhookPayload(rawPayload) {
  console.log(
    '[cvcrm/webhook] Payload bruto recebido:',
    JSON.stringify(rawPayload, null, 2),
  );

  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('[cvcrm/webhook] NEON_LEADS_DATABASE_URL não configurada — raw_payload não persistido.');
    return;
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    await client.query(
      `INSERT INTO cvcrm_webhook_logs (
         received_at,
         processed,
         raw_payload,
         event_type
       ) VALUES (
         now(),
         false,
         $1::jsonb,
         'lead_update_raw'
       )`,
      [JSON.stringify(rawPayload)],
    );
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') {
      console.error('[cvcrm/webhook] Erro ao gravar raw_payload:', err?.message ?? err);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

export async function processCvcrmWebhook(incoming) {
  const rawPayload =
    incoming && typeof incoming === 'object' && 'body' in incoming
      ? incoming
      : { headers: {}, body: incoming, query: {} };

  await captureRawWebhookPayload(rawPayload);

  const payload = rawPayload.body;
  const idlead = payload?.idlead ?? payload?.idLead ?? payload?.id;
  if (idlead === null || idlead === undefined || toSafeString(idlead) === '') {
    console.warn('[cvcrm/webhook] Payload sem idlead:', payload);
    return { idlead: null, queued: false, error: 'idlead ausente' };
  }

  try {
    await enqueueCvcrmPendingUpdate(idlead);
    console.log(`[cvcrm/webhook] idlead=${idlead} enfileirado em cvcrm_pending_updates`);
    return { idlead, queued: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cvcrm/webhook] Falha ao enfileirar idlead=${idlead}:`, message);
    return { idlead, queued: false, error: message };
  }
}
