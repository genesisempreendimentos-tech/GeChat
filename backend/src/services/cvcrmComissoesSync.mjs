import pg from 'pg';
import {
  getCvcrmCredentials,
  getNeonLeadsUrl,
  toCvcrmTimestamptzParam,
} from './cvcrmBatchSync.mjs';
import { parseBooleanFlag } from './cvcrmReservasSync.mjs';

const CVCRM_CVDW_COMISSOES_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/comissoes';
const CVCRM_CVDW_COMISSOES_PAGAMENTOS_URL =
  'https://genesis.cvcrm.com.br/api/v1/cvdw/comissoes/pagamentos';
const CVDW_PAGE_SIZE = 500;
const COMISSOES_SYNC_MIN_INTERVAL_MS = 30_000;

let comissoesSyncInFlight = false;
let lastComissoesSyncAt = 0;

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function toBigIntId(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseNumeric(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDateOnly(value) {
  const raw = toSafeString(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const ts = parseCvcrmDateTimeParam(value);
  if (!ts) return null;
  return String(ts).slice(0, 10);
}

function parseCvcrmDateTimeParam(value) {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00-03:00`;
  }
  return toCvcrmTimestamptzParam(value);
}

function brtTimestamp(date = new Date()) {
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
      `CVCRM CVDW comissões indisponível: GET → ${res.status} (${text?.slice(0, 500) || 'sem body'})`,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function fetchCvdwSince(baseUrl, sinceBrt, logLabel) {
  const since = toSafeString(sinceBrt) || '2000-01-01 00:00:00';
  const allRows = [];
  let pagina = 1;
  let totalPages = 1;

  while (pagina <= totalPages) {
    const pageParams = new URLSearchParams({
      registros_por_pagina: String(CVDW_PAGE_SIZE),
      pagina: String(pagina),
    });
    const url = `${baseUrl}?a_partir_data_referencia=${encodeURIComponent(since)}&${pageParams}`;
    const pageData = await cvcrmApiRequest(url);
    const dados = Array.isArray(pageData.dados) ? pageData.dados : [];
    allRows.push(...dados);
    totalPages = Number(pageData.total_de_paginas) || 1;
    if (logLabel) {
      console.log(`[cvcrm/comissoes/${logLabel}] página ${pagina}/${totalPages} — ${dados.length} registro(s)`);
    }
    pagina += 1;
  }

  return allRows;
}

export function parseCvdwComissaoRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    idcomissao: toBigIntId(raw.idcomissao),
    idreserva: toBigIntId(raw.idreserva),
    corretor: toSafeString(raw.corretor) || null,
    imobiliaria: toSafeString(raw.imobiliaria) || null,
    empreendimento: toSafeString(raw.empreendimento) || null,
    situacao: toSafeString(raw.situacao) || null,
    idsituacao: toBigIntId(raw.idsituacao),
    ativo: parseBooleanFlag(raw.ativo),
    porcentagem_comissao: parseNumeric(raw.porcentagem_comissao),
    valor_comissao: parseNumeric(raw.valor_comissao),
    valor_comissao_apagar: parseNumeric(raw.valor_comissao_apagar),
    valor_pagamento: parseNumeric(raw.valor_pagamento),
    valor_contrato: parseNumeric(raw.valor_contrato),
    data_pagamento: parseCvcrmDateTimeParam(raw.data_pagamento),
    data_cad: parseCvcrmDateTimeParam(raw.data_cad),
    referencia_data: parseCvcrmDateTimeParam(raw.referencia_data),
    etapa: toSafeString(raw.etapa) || null,
    bloco: toSafeString(raw.bloco) || null,
    unidade: toSafeString(raw.unidade) || null,
    regiao: toSafeString(raw.regiao) || null,
    cliente: toSafeString(raw.cliente) || null,
    payload: raw,
  };
}

export function parseCvdwComissaoPagamentoRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    idpagamento: toBigIntId(raw.idpagamento),
    idcomissao: toBigIntId(raw.idcomissao),
    valor: parseNumeric(raw.valor),
    vencimento: parseDateOnly(raw.vencimento),
    situacao: toSafeString(raw.situacao) || null,
    idboleto: toSafeString(raw.idBoleto ?? raw.idboleto) || null,
    bloco: toSafeString(raw.bloco) || null,
    unidade: toSafeString(raw.unidade) || null,
    referencia_data: parseCvcrmDateTimeParam(raw.referencia_data),
    payload: raw,
  };
}

async function resolveIdcorretorFromReserva(client, idreserva) {
  if (idreserva == null) return null;
  const result = await client.query(
    `SELECT idcorretor FROM cvcrm_reservas WHERE idreserva = $1`,
    [idreserva],
  );
  const idcorretor = result.rows[0]?.idcorretor;
  return idcorretor ? toSafeString(idcorretor) || null : null;
}

async function upsertCvcrmComissao(client, parsed) {
  const idcorretor = await resolveIdcorretorFromReserva(client, parsed.idreserva);

  await client.query(
    `INSERT INTO cvcrm_comissoes (
       idcomissao,
       idreserva,
       idcorretor,
       corretor,
       imobiliaria,
       empreendimento,
       situacao,
       idsituacao,
       ativo,
       porcentagem_comissao,
       valor_comissao,
       valor_comissao_apagar,
       valor_pagamento,
       valor_contrato,
       data_pagamento,
       data_cad,
       referencia_data,
       etapa,
       bloco,
       unidade,
       regiao,
       cliente,
       payload,
       last_synced_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15::timestamptz, $16::timestamptz, $17::timestamptz,
       $18, $19, $20, $21, $22, $23::jsonb, now()
     )
     ON CONFLICT (idcomissao) DO UPDATE SET
       idreserva = EXCLUDED.idreserva,
       idcorretor = EXCLUDED.idcorretor,
       corretor = EXCLUDED.corretor,
       imobiliaria = EXCLUDED.imobiliaria,
       empreendimento = EXCLUDED.empreendimento,
       situacao = EXCLUDED.situacao,
       idsituacao = EXCLUDED.idsituacao,
       ativo = EXCLUDED.ativo,
       porcentagem_comissao = EXCLUDED.porcentagem_comissao,
       valor_comissao = EXCLUDED.valor_comissao,
       valor_comissao_apagar = EXCLUDED.valor_comissao_apagar,
       valor_pagamento = EXCLUDED.valor_pagamento,
       valor_contrato = EXCLUDED.valor_contrato,
       data_pagamento = EXCLUDED.data_pagamento,
       data_cad = EXCLUDED.data_cad,
       referencia_data = EXCLUDED.referencia_data,
       etapa = EXCLUDED.etapa,
       bloco = EXCLUDED.bloco,
       unidade = EXCLUDED.unidade,
       regiao = EXCLUDED.regiao,
       cliente = EXCLUDED.cliente,
       payload = EXCLUDED.payload,
       last_synced_at = now()`,
    [
      parsed.idcomissao,
      parsed.idreserva,
      idcorretor,
      parsed.corretor,
      parsed.imobiliaria,
      parsed.empreendimento,
      parsed.situacao,
      parsed.idsituacao,
      parsed.ativo,
      parsed.porcentagem_comissao,
      parsed.valor_comissao,
      parsed.valor_comissao_apagar,
      parsed.valor_pagamento,
      parsed.valor_contrato,
      parsed.data_pagamento,
      parsed.data_cad,
      parsed.referencia_data,
      parsed.etapa,
      parsed.bloco,
      parsed.unidade,
      parsed.regiao,
      parsed.cliente,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

async function upsertCvcrmComissaoPagamento(client, parsed) {
  await client.query(
    `INSERT INTO cvcrm_comissao_pagamentos (
       idpagamento,
       idcomissao,
       valor,
       vencimento,
       situacao,
       idboleto,
       bloco,
       unidade,
       referencia_data,
       payload,
       last_synced_at
     ) VALUES (
       $1, $2, $3, $4::date, $5, $6, $7, $8, $9::timestamptz, $10::jsonb, now()
     )
     ON CONFLICT (idpagamento) DO UPDATE SET
       idcomissao = EXCLUDED.idcomissao,
       valor = EXCLUDED.valor,
       vencimento = EXCLUDED.vencimento,
       situacao = EXCLUDED.situacao,
       idboleto = EXCLUDED.idboleto,
       bloco = EXCLUDED.bloco,
       unidade = EXCLUDED.unidade,
       referencia_data = EXCLUDED.referencia_data,
       payload = EXCLUDED.payload,
       last_synced_at = now()`,
    [
      parsed.idpagamento,
      parsed.idcomissao,
      parsed.valor,
      parsed.vencimento,
      parsed.situacao,
      parsed.idboleto,
      parsed.bloco,
      parsed.unidade,
      parsed.referencia_data,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

export async function upsertCvcrmComissaoRow(client, raw) {
  const parsed = parseCvdwComissaoRow(raw);
  if (!parsed?.idcomissao) {
    throw new Error('idcomissao inválido no payload CVDW');
  }
  await upsertCvcrmComissao(client, parsed);
  return parsed;
}

export async function upsertCvcrmComissaoPagamentoRow(client, raw) {
  const parsed = parseCvdwComissaoPagamentoRow(raw);
  if (!parsed?.idpagamento) {
    throw new Error('idpagamento inválido no payload CVDW');
  }
  await upsertCvcrmComissaoPagamento(client, parsed);
  return parsed;
}

export async function applyCvdwComissaoIncremental(client, raw) {
  const parsed = parseCvdwComissaoRow(raw);
  if (!parsed?.idcomissao) {
    throw new Error('idcomissao inválido no payload CVDW');
  }
  await upsertCvcrmComissao(client, parsed);
  return { idcomissao: parsed.idcomissao };
}

export async function applyCvdwComissaoPagamentoIncremental(client, raw) {
  const parsed = parseCvdwComissaoPagamentoRow(raw);
  if (!parsed?.idpagamento) {
    throw new Error('idpagamento inválido no payload CVDW');
  }
  await upsertCvcrmComissaoPagamento(client, parsed);
  return { idpagamento: parsed.idpagamento };
}

export async function fetchAllCvdwComissoesSince(sinceBrt = '2000-01-01 00:00:00') {
  return fetchCvdwSince(CVCRM_CVDW_COMISSOES_URL, sinceBrt, 'backfill');
}

export async function fetchAllCvdwComissaoPagamentosSince(sinceBrt = '2000-01-01 00:00:00') {
  return fetchCvdwSince(CVCRM_CVDW_COMISSOES_PAGAMENTOS_URL, sinceBrt, 'pagamentos/backfill');
}

export async function ensureCvcrmComissoesSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cvcrm_comissoes (
      idcomissao              BIGINT PRIMARY KEY,
      idreserva               BIGINT,
      idcorretor              TEXT,
      corretor                TEXT,
      imobiliaria             TEXT,
      empreendimento          TEXT,
      situacao                TEXT,
      idsituacao              BIGINT,
      ativo                   BOOLEAN,
      porcentagem_comissao    NUMERIC,
      valor_comissao          NUMERIC,
      valor_comissao_apagar   NUMERIC,
      valor_pagamento         NUMERIC,
      valor_contrato          NUMERIC,
      data_pagamento          TIMESTAMPTZ,
      data_cad                TIMESTAMPTZ,
      referencia_data         TIMESTAMPTZ,
      etapa                   TEXT,
      bloco                   TEXT,
      unidade                 TEXT,
      regiao                  TEXT,
      cliente                 TEXT,
      payload                 JSONB,
      last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cvcrm_comissoes_idreserva
      ON cvcrm_comissoes (idreserva)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cvcrm_comissoes_idcorretor
      ON cvcrm_comissoes (idcorretor)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS cvcrm_comissao_pagamentos (
      idpagamento             BIGINT PRIMARY KEY,
      idcomissao              BIGINT,
      valor                   NUMERIC,
      vencimento              DATE,
      situacao                TEXT,
      idboleto                TEXT,
      bloco                   TEXT,
      unidade                 TEXT,
      referencia_data         TIMESTAMPTZ,
      payload                 JSONB,
      last_synced_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_cvcrm_comissao_pagamentos_idcomissao
      ON cvcrm_comissao_pagamentos (idcomissao)
  `);
  await client.query(
    `INSERT INTO cvcrm_sync_cursors (entity) VALUES ('comissoes'), ('comissoes_pagamentos')
     ON CONFLICT (entity) DO NOTHING`,
  );
}

export async function backfillCvcrmComissoesFromCvdw(
  client,
  { sinceBrt = '2000-01-01 00:00:00' } = {},
) {
  await ensureCvcrmComissoesSchema(client);

  const comissaoRows = await fetchAllCvdwComissoesSince(sinceBrt);
  let comissoesUpserted = 0;
  let comissoesSkipped = 0;
  let comissoesErrors = 0;

  for (const raw of comissaoRows) {
    try {
      const parsed = parseCvdwComissaoRow(raw);
      if (!parsed?.idcomissao) {
        comissoesSkipped += 1;
        continue;
      }
      await upsertCvcrmComissao(client, parsed);
      comissoesUpserted += 1;
      if (comissoesUpserted % 250 === 0) {
        console.log(`[cvcrm/comissoes/backfill] upsert ${comissoesUpserted}/${comissaoRows.length}`);
      }
    } catch (err) {
      comissoesErrors += 1;
      console.error(
        `[cvcrm/comissoes/backfill] erro idcomissao=${raw?.idcomissao ?? '?'}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const pagamentoRows = await fetchAllCvdwComissaoPagamentosSince(sinceBrt);
  let pagamentosUpserted = 0;
  let pagamentosSkipped = 0;
  let pagamentosErrors = 0;

  for (const raw of pagamentoRows) {
    try {
      const parsed = parseCvdwComissaoPagamentoRow(raw);
      if (!parsed?.idpagamento) {
        pagamentosSkipped += 1;
        continue;
      }
      await upsertCvcrmComissaoPagamento(client, parsed);
      pagamentosUpserted += 1;
      if (pagamentosUpserted % 250 === 0) {
        console.log(
          `[cvcrm/comissoes/pagamentos/backfill] upsert ${pagamentosUpserted}/${pagamentoRows.length}`,
        );
      }
    } catch (err) {
      pagamentosErrors += 1;
      console.error(
        `[cvcrm/comissoes/pagamentos/backfill] erro idpagamento=${raw?.idpagamento ?? '?'}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return {
    since_brt: sinceBrt,
    comissoes: {
      fetched: comissaoRows.length,
      upserted: comissoesUpserted,
      skipped: comissoesSkipped,
      errors: comissoesErrors,
    },
    pagamentos: {
      fetched: pagamentoRows.length,
      upserted: pagamentosUpserted,
      skipped: pagamentosSkipped,
      errors: pagamentosErrors,
    },
  };
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

function resolveSinceUtc(cursorAt, runStart, { sweep48h = false } = {}) {
  const CURSOR_BUFFER_MS = 10 * 60 * 1000;
  const FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
  const SWEEP_LOOKBACK_MS = 48 * 60 * 60 * 1000;

  if (sweep48h) {
    return new Date(runStart.getTime() - SWEEP_LOOKBACK_MS);
  }
  if (cursorAt) {
    return new Date(new Date(cursorAt).getTime() - CURSOR_BUFFER_MS);
  }
  return new Date(runStart.getTime() - FIRST_RUN_LOOKBACK_MS);
}

export async function syncComissoesIncremental(client, { runStart, sweep48h = false } = {}) {
  const cursorAt = await getSyncCursor(client, 'comissoes');
  const sinceUtc = resolveSinceUtc(cursorAt, runStart, { sweep48h });
  const sinceBrt = brtTimestamp(sinceUtc);

  const rows = await fetchCvdwSince(CVCRM_CVDW_COMISSOES_URL, sinceBrt, 'incremental');
  let processed = 0;
  let errors = 0;

  for (const raw of rows) {
    try {
      await applyCvdwComissaoIncremental(client, raw);
      processed += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `[cvcrm/incremental/comissoes] Erro idcomissao=${raw?.idcomissao ?? '?'}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  await setSyncCursor(client, 'comissoes', runStart);

  console.log(
    `[cvcrm/incremental/comissoes] since_brt=${sinceBrt} processed=${processed} total_baixados=${rows.length} errors=${errors}`,
  );

  return {
    processed,
    errors,
    total_baixados: rows.length,
    since_brt: sinceBrt,
    cursor_before: cursorAt ? cursorAt.toISOString() : null,
    cursor_after: runStart.toISOString(),
  };
}

export async function syncComissoesPagamentosIncremental(client, { runStart, sweep48h = false } = {}) {
  const cursorAt = await getSyncCursor(client, 'comissoes_pagamentos');
  const sinceUtc = resolveSinceUtc(cursorAt, runStart, { sweep48h });
  const sinceBrt = brtTimestamp(sinceUtc);

  const rows = await fetchCvdwSince(CVCRM_CVDW_COMISSOES_PAGAMENTOS_URL, sinceBrt, 'pagamentos/incremental');
  let processed = 0;
  let errors = 0;

  for (const raw of rows) {
    try {
      await applyCvdwComissaoPagamentoIncremental(client, raw);
      processed += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `[cvcrm/incremental/comissoes_pagamentos] Erro idpagamento=${raw?.idpagamento ?? '?'}`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  await setSyncCursor(client, 'comissoes_pagamentos', runStart);

  console.log(
    `[cvcrm/incremental/comissoes_pagamentos] since_brt=${sinceBrt} processed=${processed} total_baixados=${rows.length} errors=${errors}`,
  );

  return {
    processed,
    errors,
    total_baixados: rows.length,
    since_brt: sinceBrt,
    cursor_before: cursorAt ? cursorAt.toISOString() : null,
    cursor_after: runStart.toISOString(),
  };
}

export async function syncComissoesNow({ skipThrottle = false, sweep48h = false } = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { processed: 0, errors: 1, message: 'Neon não configurado' };
  }

  if (!skipThrottle) {
    if (comissoesSyncInFlight) {
      return { processed: 0, skipped: true, message: 'Sincronização de comissões em andamento' };
    }
    if (Date.now() - lastComissoesSyncAt < COMISSOES_SYNC_MIN_INTERVAL_MS) {
      return { processed: 0, skipped: true, message: 'Sincronização recente, aguarde' };
    }
  } else if (comissoesSyncInFlight) {
    return { processed: 0, skipped: true, message: 'Sincronização de comissões em andamento' };
  }

  comissoesSyncInFlight = true;
  lastComissoesSyncAt = Date.now();
  const runStart = new Date();

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

  try {
    await client.connect();
    await ensureCvcrmComissoesSchema(client);

    const comissoesResult = await syncComissoesIncremental(client, { runStart, sweep48h });
    const pagamentosResult = await syncComissoesPagamentosIncremental(client, { runStart, sweep48h });

    return {
      processed: comissoesResult.processed + pagamentosResult.processed,
      comissoes: comissoesResult,
      pagamentos: pagamentosResult,
      errors: comissoesResult.errors + pagamentosResult.errors,
      run_start: runStart.toISOString(),
    };
  } finally {
    comissoesSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

export async function runComissoesDiagnostics(client) {
  const totals = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM cvcrm_comissoes) AS comissoes_total,
      (SELECT COUNT(*)::int FROM cvcrm_comissao_pagamentos) AS pagamentos_total,
      (SELECT COUNT(*)::int FROM cvcrm_comissoes WHERE COALESCE(valor_comissao, 0) > 0) AS com_valor_positivo,
      (SELECT COUNT(*)::int FROM cvcrm_comissoes c
         INNER JOIN cvcrm_reservas r ON r.idreserva = c.idreserva) AS join_reserva_match,
      (SELECT COUNT(*)::int FROM cvcrm_comissoes WHERE idcorretor IS NOT NULL AND TRIM(idcorretor) <> '') AS idcorretor_resolvido,
      (SELECT COUNT(*)::int FROM cvcrm_comissoes
         WHERE TRIM(corretor) = 'Corretor Demonstração'
            OR cliente ILIKE 'Teste%') AS parecem_teste
  `);

  const porSituacao = await client.query(`
    SELECT COALESCE(NULLIF(TRIM(situacao), ''), '(vazio)') AS situacao,
           COUNT(*)::int AS n,
           COUNT(*) FILTER (WHERE COALESCE(valor_comissao, 0) > 0)::int AS com_valor_positivo,
           COALESCE(SUM(valor_comissao), 0)::numeric AS soma_valor_comissao
    FROM cvcrm_comissoes
    GROUP BY 1
    ORDER BY n DESC
  `);

  return {
    totals: totals.rows[0],
    por_situacao: porSituacao.rows,
  };
}
