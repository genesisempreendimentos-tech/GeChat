import pg from 'pg';
import { getNeonLeadsUrl } from './cvcrmBatchSync.mjs';
import { enqueueCvcrmPendingReserva } from './cvcrmReservasSync.mjs';

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

async function captureRawWebhookPayload(rawPayload) {
  console.log(
    '[cvcrm/webhook/reserva] Payload bruto recebido:',
    JSON.stringify(rawPayload, null, 2),
  );

  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('[cvcrm/webhook/reserva] NEON não configurado — raw_payload não persistido.');
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
         'reserva_update_raw'
       )`,
      [JSON.stringify(rawPayload)],
    );
  } catch (err) {
    if (err?.code !== '42P01' && err?.code !== '42703') {
      console.error('[cvcrm/webhook/reserva] Erro ao gravar raw_payload:', err?.message ?? err);
    }
  } finally {
    await client.end().catch(() => {});
  }
}

export async function processCvcrmReservaWebhook(incoming) {
  const rawPayload =
    incoming && typeof incoming === 'object' && 'body' in incoming
      ? incoming
      : { headers: {}, body: incoming, query: {} };

  await captureRawWebhookPayload(rawPayload);

  const payload = rawPayload.body;
  const idreserva =
    payload?.idreserva ?? payload?.idReserva ?? payload?.id_reserva ?? payload?.id;
  if (idreserva === null || idreserva === undefined || toSafeString(idreserva) === '') {
    console.warn('[cvcrm/webhook/reserva] Payload sem idreserva:', payload);
    return { idreserva: null, queued: false, error: 'idreserva ausente' };
  }

  try {
    await enqueueCvcrmPendingReserva(idreserva);
    console.log(`[cvcrm/webhook/reserva] idreserva=${idreserva} enfileirado em cvcrm_pending_reservas`);
    return { idreserva: toReservaIdNumber(idreserva), queued: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[cvcrm/webhook/reserva] Falha ao enfileirar idreserva=${idreserva}:`, message);
    return { idreserva, queued: false, error: message };
  }
}
