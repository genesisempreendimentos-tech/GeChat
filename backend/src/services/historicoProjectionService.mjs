import {
  normalizeCanalBucketLabel,
  normalizeFonteLabel,
  resolveFonteFromBucket,
} from '../lib/leadsCanalMap.mjs';
import { buildGeleadsLookup, resolveGeleadsIdFromCvcrmLeadId, resolveGeleadsIdFromLeadRow } from '../lib/geleadsLookup.mjs';
import { ensureHistoricoSchema } from '../lib/historicoSchema.mjs';
import {
  resolveHistoricoEmpreendimentoCru,
  resolveHistoricoEmpreendimentoNorm,
} from '../lib/historicoEmpreendimento.mjs';
import { loadEmpreendimentoResolver } from './empreendimentoResolver.mjs';
import { seedCvcrmReservaUpdatesFromExisting } from './cvcrmReservasSync.mjs';
import { toCvcrmTimestamptzParam } from './cvcrmBatchSync.mjs';

const BATCH_SIZE = 500;

const TIPO = Object.freeze({
  LEAD_CRIADO: 'lead_criado',
  LEAD_MUDOU: 'lead_mudou_situacao',
  RESERVA_CRIADA: 'reserva_criada',
  RESERVA_MUDOU: 'reserva_mudou_situacao',
});

function toSafeString(value) {
  if (value == null) return '';
  return String(value).trim();
}

function toLeadIdBigint(idlead) {
  const n = Number(idlead);
  return Number.isFinite(n) ? n : null;
}

async function getCursor(client, sourceKey) {
  const { rows } = await client.query(
    `SELECT cursor_ts, cursor_bigint, meta FROM historico_projection_cursors WHERE source_key = $1`,
    [sourceKey],
  );
  return rows[0] ?? null;
}

async function setCursor(client, sourceKey, { cursorTs = null, cursorBigint = null, meta = null } = {}) {
  await client.query(
    `INSERT INTO historico_projection_cursors (source_key, cursor_ts, cursor_bigint, meta, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (source_key) DO UPDATE SET
       cursor_ts = COALESCE(EXCLUDED.cursor_ts, historico_projection_cursors.cursor_ts),
       cursor_bigint = COALESCE(EXCLUDED.cursor_bigint, historico_projection_cursors.cursor_bigint),
       meta = COALESCE(EXCLUDED.meta, historico_projection_cursors.meta),
       updated_at = now()`,
    [sourceKey, cursorTs, cursorBigint, meta ? JSON.stringify(meta) : null],
  );
}

async function insertHistoricoEvents(client, events) {
  if (!events?.length) return 0;
  let inserted = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const chunk = events.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    let p = 1;

    for (const event of chunk) {
      values.push(
        `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}::timestamptz, $${p++}::jsonb)`,
      );
      params.push(
        event.tipo,
        event.entidade,
        event.geleads_id ?? null,
        event.cvcrm_lead_id ?? null,
        event.cvcrm_reserva_id ?? null,
        event.lead_nome ?? null,
        event.empreendimento_cru ?? null,
        event.empreendimento_norm ?? null,
        event.canal ?? null,
        event.fonte ?? null,
        event.valor_de ?? null,
        event.valor_para ?? null,
        event.corretor ?? null,
        event.origem ?? 'CV',
        event.ocorrido_em,
        event.payload ? JSON.stringify(event.payload) : null,
      );
    }

    const result = await client.query(
      `INSERT INTO historico_movimentacoes (
         tipo, entidade, geleads_id, cvcrm_lead_id, cvcrm_reserva_id,
         lead_nome, empreendimento_cru, empreendimento_norm, canal, fonte,
         valor_de, valor_para, corretor, origem, ocorrido_em, payload
       ) VALUES ${values.join(', ')}
       ON CONFLICT DO NOTHING`,
      params,
    );
    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

async function insertHistoricoEvent(client, event) {
  return insertHistoricoEvents(client, [event]);
}

function resolveGeleadsIdFromReservaIdlead(idleadStr, lookup) {
  for (const part of toSafeString(idleadStr).split(',')) {
    const gid = resolveGeleadsIdFromCvcrmLeadId(part, lookup);
    if (gid) return gid;
  }
  return null;
}

function resolveCanalFonteFromCanal(canalRaw) {
  const canal = normalizeCanalBucketLabel(toSafeString(canalRaw) || 'Outros');
  const fonte = normalizeFonteLabel(resolveFonteFromBucket(canal));
  return { canal, fonte };
}

function resolveReservaCreatedAt(row) {
  const payload = row.payload ?? {};
  const fromPayload =
    toCvcrmTimestamptzParam(payload.data_cad) ??
    toCvcrmTimestamptzParam(payload.data_cadastro) ??
    toCvcrmTimestamptzParam(payload.data_reserva) ??
    toCvcrmTimestamptzParam(payload.data);
  if (fromPayload) return fromPayload;
  if (row.last_synced_at instanceof Date) return row.last_synced_at.toISOString();
  if (row.last_synced_at) return new Date(row.last_synced_at).toISOString();
  return new Date().toISOString();
}

export async function projectLeadCriado(client, lookup, { incremental = false } = {}) {
  const cursor = incremental ? await getCursor(client, 'lead_criado') : null;
  let cursorTs = cursor?.cursor_ts ? new Date(cursor.cursor_ts) : null;
  let cursorId = cursor?.meta?.last_id ?? null;
  let inserted = 0;
  let scanned = 0;

  for (;;) {
    const params = [];
    let where = '1=1';
    if (cursorTs) {
      params.push(cursorTs.toISOString());
      const tsIdx = params.length;
      if (cursorId != null) {
        params.push(String(cursorId));
        const idIdx = params.length;
        where = `(al.created_at, al.id::text) > ($${tsIdx}::timestamptz, $${idIdx}::text)`;
      } else {
        where = `al.created_at > $${tsIdx}::timestamptz`;
      }
    }

    params.push(BATCH_SIZE);
    const limitIdx = params.length;

    const { rows } = await client.query(
      `SELECT al.id, al.source_table, al.created_at, al.name, al.email, al.phone,
              al.canal, al.empreendimento_interesse, al.cvcrm_lead_id
       FROM all_leads al
       WHERE ${where}
       ORDER BY al.created_at ASC, al.id ASC
       LIMIT $${limitIdx}`,
      params,
    );

    if (!rows.length) break;
    scanned += rows.length;

    const batch = rows.map((row) => {
      const empCru = resolveHistoricoEmpreendimentoCru(row.empreendimento_interesse);
      const { canal, fonte } = resolveCanalFonteFromCanal(row.canal);
      const ocorridoEm =
        row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
      return {
        tipo: TIPO.LEAD_CRIADO,
        entidade: 'lead',
        geleads_id: resolveGeleadsIdFromLeadRow(row, lookup),
        cvcrm_lead_id: toLeadIdBigint(row.cvcrm_lead_id),
        lead_nome: toSafeString(row.name) || null,
        empreendimento_cru: empCru,
        empreendimento_norm: resolveHistoricoEmpreendimentoNorm(row.empreendimento_interesse),
        canal,
        fonte,
        valor_de: null,
        valor_para: `${row.source_table}:${row.id}`,
        origem: 'CV',
        ocorrido_em: ocorridoEm,
        payload: { source_table: row.source_table, cadastro_id: row.id },
      };
    });

    inserted += await insertHistoricoEvents(client, batch);

    for (const row of rows) {
      cursorTs = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
      cursorId = row.id;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  if (cursorTs) {
    await setCursor(client, 'lead_criado', {
      cursorTs: cursorTs.toISOString(),
      cursorBigint: null,
      meta: { last_id: cursorId },
    });
  }

  return { scanned, inserted };
}

export async function projectLeadMudouSituacao(client, lookup, { incremental = false } = {}) {
  const cursor = incremental ? await getCursor(client, 'lead_mudou') : null;
  let lastSyncedAt = cursor?.cursor_ts ? new Date(cursor.cursor_ts) : null;
  let lastId = cursor?.cursor_bigint ?? 0;
  let inserted = 0;
  let scanned = 0;

  for (;;) {
    const params = [];
    let where = `(changes ? 'cvcrm_situation')`;
    if (lastSyncedAt) {
      params.push(lastSyncedAt.toISOString());
      params.push(lastId);
      where += ` AND (synced_at, id) > ($1::timestamptz, $2::bigint)`;
    }
    params.push(BATCH_SIZE);
    const limitIdx = params.length;

    const { rows } = await client.query(
      `SELECT id, idlead, cvcrm_lead_id, lead_name, changes, synced_at
       FROM cvcrm_lead_updates
       WHERE ${where}
       ORDER BY synced_at ASC, id ASC
       LIMIT $${limitIdx}`,
      params,
    );

    if (!rows.length) break;
    scanned += rows.length;

    for (const row of rows) {
      const change = row.changes?.cvcrm_situation;
      if (!change || typeof change !== 'object') continue;

      const cvcrmId = toLeadIdBigint(row.idlead ?? row.cvcrm_lead_id);
      const geleadsId = cvcrmId != null ? resolveGeleadsIdFromCvcrmLeadId(cvcrmId, lookup) : null;
      const ocorridoEm =
        row.synced_at instanceof Date ? row.synced_at.toISOString() : String(row.synced_at);

      inserted += await insertHistoricoEvent(client, {
        tipo: TIPO.LEAD_MUDOU,
        entidade: 'lead',
        geleads_id: geleadsId,
        cvcrm_lead_id: cvcrmId,
        lead_nome: toSafeString(row.lead_name) || null,
        valor_de: change.de != null ? String(change.de) : null,
        valor_para: change.para != null ? String(change.para) : null,
        origem: 'CV',
        ocorrido_em: ocorridoEm,
        payload: { hora_deteccao: true, changes: row.changes },
      });

      lastSyncedAt = row.synced_at instanceof Date ? row.synced_at : new Date(row.synced_at);
      lastId = Number(row.id);
    }

    if (rows.length < BATCH_SIZE) break;
  }

  if (lastSyncedAt) {
    await setCursor(client, 'lead_mudou', {
      cursorTs: lastSyncedAt.toISOString(),
      cursorBigint: lastId,
    });
  }

  return { scanned, inserted };
}

export async function projectReservaCriada(client, lookup, { incremental = false } = {}) {
  const cursor = incremental ? await getCursor(client, 'reserva_criada') : null;
  let lastTs = cursor?.cursor_ts ? new Date(cursor.cursor_ts) : null;
  let lastIdreserva = cursor?.cursor_bigint ?? 0;
  let inserted = 0;
  let scanned = 0;

  for (;;) {
    const params = [];
    let where = '1=1';
    if (lastTs) {
      params.push(lastTs.toISOString());
      params.push(lastIdreserva);
      where = `(COALESCE(
        NULLIF(TRIM(r.payload->>'data_cad'), '')::timestamptz,
        NULLIF(TRIM(r.payload->>'data_cadastro'), '')::timestamptz,
        r.last_synced_at
      ), r.idreserva) > ($1::timestamptz, $2::bigint)`;
    }
    params.push(BATCH_SIZE);
    const limitIdx = params.length;

    const { rows } = await client.query(
      `SELECT r.idreserva, r.idlead, r.situacao, r.empreendimento, r.idcorretor, r.payload, r.last_synced_at,
              cr.nome AS corretor_nome
       FROM cvcrm_reservas r
       LEFT JOIN cvcrm_corretores cr ON cr.idcorretor::text = NULLIF(TRIM(r.idcorretor), '')
       WHERE ${where}
       ORDER BY COALESCE(
         NULLIF(TRIM(r.payload->>'data_cad'), '')::timestamptz,
         NULLIF(TRIM(r.payload->>'data_cadastro'), '')::timestamptz,
         r.last_synced_at
       ) ASC, r.idreserva ASC
       LIMIT $${limitIdx}`,
      params,
    );

    if (!rows.length) break;
    scanned += rows.length;

    for (const row of rows) {
      const ocorridoEm = resolveReservaCreatedAt(row);
      const empCru = resolveHistoricoEmpreendimentoCru(row.empreendimento);
      const idleadStr = toSafeString(row.idlead);
      const geleadsId = resolveGeleadsIdFromReservaIdlead(idleadStr, lookup);

      inserted += await insertHistoricoEvent(client, {
        tipo: TIPO.RESERVA_CRIADA,
        entidade: 'reserva',
        geleads_id: geleadsId,
        cvcrm_lead_id: toLeadIdBigint(idleadStr.split(',')[0]),
        cvcrm_reserva_id: Number(row.idreserva),
        empreendimento_cru: empCru,
        empreendimento_norm: resolveHistoricoEmpreendimentoNorm(row.empreendimento),
        corretor: toSafeString(row.corretor_nome) || null,
        valor_para: toSafeString(row.situacao) || 'Nova reserva',
        origem: 'CV',
        ocorrido_em: ocorridoEm,
        payload: { idreserva: row.idreserva, idlead: row.idlead },
      });

      lastTs = new Date(ocorridoEm);
      lastIdreserva = Number(row.idreserva);
    }

    if (rows.length < BATCH_SIZE) break;
  }

  if (lastTs) {
    await setCursor(client, 'reserva_criada', {
      cursorTs: lastTs.toISOString(),
      cursorBigint: lastIdreserva,
    });
  }

  return { scanned, inserted };
}

export async function projectReservaMudouSituacao(client, lookup, { incremental = false } = {}) {
  const cursor = incremental ? await getCursor(client, 'reserva_mudou') : null;
  let lastObserved = cursor?.cursor_ts ? new Date(cursor.cursor_ts) : null;
  let lastUuid = cursor?.meta?.last_id ?? null;
  let inserted = 0;
  let scanned = 0;

  for (;;) {
    const params = [];
    let where = '1=1';
    if (lastObserved) {
      params.push(lastObserved.toISOString());
      params.push(lastUuid ?? '00000000-0000-0000-0000-000000000000');
      where = `(observed_at, id) > ($1::timestamptz, $2::uuid)`;
    }
    params.push(BATCH_SIZE);
    const limitIdx = params.length;

    const { rows } = await client.query(
      `SELECT u.id, u.idreserva, u.idlead, u.situacao_anterior, u.situacao_nova,
              u.changed_at, u.observed_at, u.empreendimento, u.idcorretor,
              cr.nome AS corretor_nome
       FROM cvcrm_reserva_updates u
       LEFT JOIN cvcrm_corretores cr ON cr.idcorretor::text = NULLIF(TRIM(u.idcorretor), '')
       WHERE ${where}
       ORDER BY u.observed_at ASC, u.id ASC
       LIMIT $${limitIdx}`,
      params,
    );

    if (!rows.length) break;
    scanned += rows.length;

    for (const row of rows) {
      const ocorridoEm =
        row.changed_at instanceof Date ? row.changed_at.toISOString() : String(row.changed_at);
      const idleadStr = toSafeString(row.idlead);
      const geleadsId = resolveGeleadsIdFromReservaIdlead(idleadStr, lookup);

      inserted += await insertHistoricoEvent(client, {
        tipo: TIPO.RESERVA_MUDOU,
        entidade: 'reserva',
        geleads_id: geleadsId,
        cvcrm_lead_id: toLeadIdBigint(idleadStr.split(',')[0]),
        cvcrm_reserva_id: Number(row.idreserva),
        empreendimento_cru: resolveHistoricoEmpreendimentoCru(row.empreendimento),
        empreendimento_norm: resolveHistoricoEmpreendimentoNorm(row.empreendimento),
        corretor: toSafeString(row.corretor_nome) || null,
        valor_de: toSafeString(row.situacao_anterior) || null,
        valor_para: toSafeString(row.situacao_nova) || null,
        origem: 'CV',
        ocorrido_em: ocorridoEm,
        payload: { idreserva: row.idreserva },
      });

      lastObserved = row.observed_at instanceof Date ? row.observed_at : new Date(row.observed_at);
      lastUuid = row.id;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  if (lastObserved) {
    await setCursor(client, 'reserva_mudou', {
      cursorTs: lastObserved.toISOString(),
      meta: { last_id: lastUuid },
    });
  }

  return { scanned, inserted };
}

export async function getHistoricoProjectionStats(client) {
  const { rows } = await client.query(`
    SELECT
      tipo,
      COUNT(*)::int AS total,
      MIN(ocorrido_em) AS min_ocorrido,
      MAX(ocorrido_em) AS max_ocorrido
    FROM historico_movimentacoes
    GROUP BY tipo
    ORDER BY tipo
  `);
  return rows;
}

/**
 * Backfill completo (idempotente) + seed de reserva updates na 1ª execução.
 * Incremental: só delta após cursores.
 */
export async function runHistoricoProjection(client, { incremental = false, forceSeed = false } = {}) {
  await ensureHistoricoSchema(client);
  await loadEmpreendimentoResolver(client, { force: true });

  const seedCursor = await getCursor(client, 'reserva_seed_done');
  let seedResult = null;
  if (!incremental && (!seedCursor || forceSeed)) {
    seedResult = await seedCvcrmReservaUpdatesFromExisting(client);
    await setCursor(client, 'reserva_seed_done', { meta: seedResult });
  }

  const lookup = await buildGeleadsLookup(client);

  const leadCriado = await projectLeadCriado(client, lookup, { incremental });
  const reservaCriada = await projectReservaCriada(client, lookup, { incremental });
  const leadMudou = await projectLeadMudouSituacao(client, lookup, { incremental });
  const reservaMudou = await projectReservaMudouSituacao(client, lookup, { incremental });

  const stats = await getHistoricoProjectionStats(client);

  return {
    incremental,
    seed: seedResult,
    projected: { leadCriado, reservaCriada, leadMudou, reservaMudou },
    stats,
  };
}
