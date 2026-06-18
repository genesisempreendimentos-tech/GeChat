import pg from 'pg';
import { getCvcrmCredentials, getNeonLeadsUrl } from './cvcrmBatchSync.mjs';
import { toTitleCasePtBr, toTitleCaseImobiliaria } from '../lib/toTitleCasePtBr.mjs';

const CVCRM_CVDW_CORRETORES_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/corretores';
const CVCRM_CVDW_IMOBILIARIAS_URL = 'https://genesis.cvcrm.com.br/api/v1/cvdw/imobiliarias';
const CVDW_PAGE_SIZE = 500;
/** Data ampla para full refresh de cadastros pequenos. */
const CADASTRO_FULL_REFRESH_DATE = '2000-01-01';

let corretoresSyncInFlight = false;
let imobiliariasSyncInFlight = false;

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function toBigintId(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function resolveReferenceDate(referenceDate) {
  const ref = toSafeString(referenceDate);
  if (!ref) return CADASTRO_FULL_REFRESH_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ref)) {
    throw new Error('referenceDate inválida; use AAAA-MM-DD');
  }
  return ref;
}

async function cvcrmApiRequest(url) {
  const { email, token } = getCvcrmCredentials();
  if (!email || !token) {
    throw new Error('CVCRM_EMAIL e CVCRM_TOKEN não configurados.');
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      email,
      token,
    },
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

async function fetchCvdwPage(baseUrl, pagina, referenceDate) {
  const params = new URLSearchParams({
    a_partir_data_referencia: referenceDate,
    registros_por_pagina: String(CVDW_PAGE_SIZE),
    pagina: String(pagina),
  });
  return cvcrmApiRequest(`${baseUrl}?${params}`);
}

async function fetchAllCvdwPages(baseUrl, { referenceDate } = {}) {
  const refDate = resolveReferenceDate(referenceDate);
  const allRows = [];
  let pagina = 1;
  let totalPages = 1;

  while (pagina <= totalPages) {
    const pageData = await fetchCvdwPage(baseUrl, pagina, refDate);
    const dados = Array.isArray(pageData.dados) ? pageData.dados : [];
    allRows.push(...dados);
    totalPages = Number(pageData.total_de_paginas) || 1;
    pagina += 1;
  }

  return { rows: allRows, reference_date: refDate };
}

export function parseCvdwCorretorRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const nomeRaw = toSafeString(raw.nome ?? raw.corretor ?? raw.name) || null;
  const imobiliariaRaw = toSafeString(raw.imobiliaria) || null;
  return {
    idcorretor: toBigintId(raw.idcorretor),
    nome: nomeRaw ? toTitleCasePtBr(nomeRaw) : null,
    documento: toSafeString(raw.documento) || null,
    idimobiliaria: toSafeString(raw.idimobiliaria) || null,
    imobiliaria: imobiliariaRaw ? toTitleCaseImobiliaria(imobiliariaRaw) : null,
    payload: raw,
  };
}

export function parseCvdwImobiliariaRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const nomeRaw = toSafeString(raw.nome ?? raw.imobiliaria ?? raw.name) || null;
  return {
    idimobiliaria: toBigintId(raw.idimobiliaria),
    nome: nomeRaw ? toTitleCaseImobiliaria(nomeRaw) : null,
    cnpj: toSafeString(raw.cnpj) || null,
    payload: raw,
  };
}

async function upsertCorretor(client, parsed) {
  const nome = parsed.nome != null ? toTitleCasePtBr(parsed.nome) : null;
  const imobiliaria =
    parsed.imobiliaria != null ? toTitleCaseImobiliaria(parsed.imobiliaria) : null;

  await client.query(
    `INSERT INTO cvcrm_corretores (
       idcorretor, nome, documento, idimobiliaria, imobiliaria, payload, last_synced_at
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
     ON CONFLICT (idcorretor) DO UPDATE SET
       nome = EXCLUDED.nome,
       documento = EXCLUDED.documento,
       idimobiliaria = EXCLUDED.idimobiliaria,
       imobiliaria = EXCLUDED.imobiliaria,
       payload = EXCLUDED.payload,
       last_synced_at = now()`,
    [
      parsed.idcorretor,
      nome,
      parsed.documento,
      parsed.idimobiliaria,
      imobiliaria,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

async function upsertImobiliaria(client, parsed) {
  const nome = parsed.nome != null ? toTitleCaseImobiliaria(parsed.nome) : null;

  await client.query(
    `INSERT INTO cvcrm_imobiliarias (
       idimobiliaria, nome, cnpj, payload, last_synced_at
     ) VALUES ($1, $2, $3, $4::jsonb, now())
     ON CONFLICT (idimobiliaria) DO UPDATE SET
       nome = EXCLUDED.nome,
       cnpj = EXCLUDED.cnpj,
       payload = EXCLUDED.payload,
       last_synced_at = now()`,
    [
      parsed.idimobiliaria,
      nome,
      parsed.cnpj,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

export async function getCorretoresCount() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return 0;

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM cvcrm_corretores`);
    return result.rows[0]?.count ?? 0;
  } catch (err) {
    if (err?.code === '42P01') return 0;
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getImobiliariasCount() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) return 0;

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM cvcrm_imobiliarias`);
    return result.rows[0]?.count ?? 0;
  } catch (err) {
    if (err?.code === '42P01') return 0;
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function syncCorretores({ referenceDate } = {}) {
  if (corretoresSyncInFlight) {
    return { synced: 0, skipped: true, message: 'Sync de corretores em andamento' };
  }

  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { synced: 0, errors: 1, message: 'Neon não configurado' };
  }

  corretoresSyncInFlight = true;
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

  try {
    await client.connect();
    const { rows, reference_date } = await fetchAllCvdwPages(CVCRM_CVDW_CORRETORES_URL, {
      referenceDate: referenceDate ?? CADASTRO_FULL_REFRESH_DATE,
    });

    let synced = 0;
    let errors = 0;

    for (const raw of rows) {
      try {
        const parsed = parseCvdwCorretorRow(raw);
        if (!parsed?.idcorretor) continue;
        await upsertCorretor(client, parsed);
        synced += 1;
      } catch (err) {
        errors += 1;
        console.error('[cvcrm/cadastros/corretores] Erro no UPSERT:', err?.message ?? err);
      }
    }

    console.log(
      `[cvcrm/cadastros/corretores] concluído: synced=${synced}, total_baixados=${rows.length}, errors=${errors}, ref=${reference_date}`,
    );

    return { synced, total_baixados: rows.length, errors, reference_date };
  } finally {
    corretoresSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

export async function syncImobiliarias({ referenceDate } = {}) {
  if (imobiliariasSyncInFlight) {
    return { synced: 0, skipped: true, message: 'Sync de imobiliárias em andamento' };
  }

  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    return { synced: 0, errors: 1, message: 'Neon não configurado' };
  }

  imobiliariasSyncInFlight = true;
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });

  try {
    await client.connect();
    const { rows, reference_date } = await fetchAllCvdwPages(CVCRM_CVDW_IMOBILIARIAS_URL, {
      referenceDate: referenceDate ?? CADASTRO_FULL_REFRESH_DATE,
    });

    let synced = 0;
    let errors = 0;

    for (const raw of rows) {
      try {
        const parsed = parseCvdwImobiliariaRow(raw);
        if (!parsed?.idimobiliaria) continue;
        await upsertImobiliaria(client, parsed);
        synced += 1;
      } catch (err) {
        errors += 1;
        console.error('[cvcrm/cadastros/imobiliarias] Erro no UPSERT:', err?.message ?? err);
      }
    }

    console.log(
      `[cvcrm/cadastros/imobiliarias] concluído: synced=${synced}, total_baixados=${rows.length}, errors=${errors}, ref=${reference_date}`,
    );

    return { synced, total_baixados: rows.length, errors, reference_date };
  } finally {
    imobiliariasSyncInFlight = false;
    await client.end().catch(() => {});
  }
}

export async function getCompetenciaReport(filters = {}) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  }

  const saleExpr = `(
    NULLIF(TRIM(r.payload->>'data_venda'), '') IS NOT NULL
    OR r.data_venda IS NOT NULL
  )`;
  const saleDateExpr = `COALESCE(r.data_venda, NULLIF(TRIM(r.payload->>'data_venda'), '')::timestamptz)`;

  const params = [];
  const whereParts = ['1=1'];

  if (filters.dataVendaDe) {
    params.push(filters.dataVendaDe);
    whereParts.push(`${saleDateExpr} >= $${params.length}::timestamptz`);
  }
  if (filters.dataVendaAte) {
    params.push(filters.dataVendaAte);
    whereParts.push(`${saleDateExpr} < ($${params.length}::date + interval '1 day')`);
  }
  if (filters.empreendimento) {
    params.push(`%${String(filters.empreendimento).trim()}%`);
    whereParts.push(`TRIM(COALESCE(r.empreendimento, '')) ILIKE $${params.length}`);
  }
  if (filters.imobiliaria) {
    params.push(`%${String(filters.imobiliaria).trim()}%`);
    const idx = params.length;
    whereParts.push(`(
      TRIM(COALESCE(r.idimobiliaria::text, '')) ILIKE $${idx}
      OR EXISTS (
        SELECT 1 FROM cvcrm_imobiliarias im
        WHERE im.idimobiliaria::text = NULLIF(TRIM(r.idimobiliaria::text), '')
          AND TRIM(COALESCE(im.nome, '')) ILIKE $${idx}
      )
    )`);
  }

  const whereSql = whereParts.join(' AND ');

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();

    const totaisResult = await client.query(
      `SELECT
         COUNT(*)::int AS reservas_totais,
         COUNT(*) FILTER (WHERE ${saleExpr})::int AS vendas_efetuadas,
         COUNT(*) FILTER (WHERE NOT (${saleExpr}))::int AS reservas_sem_venda,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) IN ('Distrato', 'Cancelada')
         )::int AS vendas_perdidas,
         COUNT(*) FILTER (
           WHERE NOT (${saleExpr}) AND TRIM(r.situacao) IN ('Vencida', 'Cancelada')
         )::int AS reservas_perdidas,
         COALESCE(
           SUM(r.valor_contrato) FILTER (WHERE ${saleExpr}),
           0
         )::numeric AS valor_efetuado,
         AVG(r.valor_contrato) FILTER (WHERE ${saleExpr})::numeric AS ticket_medio,
         COUNT(DISTINCT r.idcorretor::text) FILTER (
           WHERE ${saleExpr}
             AND NULLIF(TRIM(r.idcorretor::text), '') IS NOT NULL
             AND TRIM(r.idcorretor::text) <> '0'
         )::int AS corretores_que_venderam,
         COUNT(*) FILTER (WHERE TRIM(r.situacao) = 'Vendida')::int AS carteira_vigente,
         COUNT(*) FILTER (WHERE TRIM(r.situacao) = 'Distrato')::int AS distratos,
         COUNT(*) FILTER (WHERE TRIM(r.situacao) = 'Cancelada')::int AS cancelados,
         COUNT(*) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Vendida')::int AS dur_vendida,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Contrato de Compra e Venda Gerado'
         )::int AS dur_contrato_gerado,
         COUNT(*) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Envio Sienge')::int AS dur_envio_sienge,
         COUNT(*) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Distrato')::int AS dur_distrato,
         COUNT(*) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Cancelada')::int AS dur_cancelada,
         COALESCE(SUM(COALESCE(r.valor_contrato, 0)), 0)::numeric AS valor_reservas_totais,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (
             WHERE NOT (${saleExpr}) AND TRIM(r.situacao) IN ('Vencida', 'Cancelada')
           ),
           0
         )::numeric AS valor_reservas_perdidas,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (
             WHERE NOT (${saleExpr}) AND TRIM(r.situacao) NOT IN ('Vencida', 'Cancelada')
           ),
           0
         )::numeric AS valor_reservas_andamento,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (
             WHERE ${saleExpr} AND TRIM(r.situacao) IN ('Distrato', 'Cancelada')
           ),
           0
         )::numeric AS valor_vendas_perdidas,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Vendida'),
           0
         )::numeric AS valor_dur_vendida,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (
             WHERE ${saleExpr} AND TRIM(r.situacao) = 'Contrato de Compra e Venda Gerado'
           ),
           0
         )::numeric AS valor_dur_contrato_gerado,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Envio Sienge'),
           0
         )::numeric AS valor_dur_envio_sienge,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Distrato'),
           0
         )::numeric AS valor_dur_distrato,
         COALESCE(
           SUM(COALESCE(r.valor_contrato, 0)) FILTER (WHERE ${saleExpr} AND TRIM(r.situacao) = 'Cancelada'),
           0
         )::numeric AS valor_dur_cancelada,
         COUNT(*) FILTER (WHERE COALESCE(r.valor_contrato, 0) > 0)::int AS qcv_reservas_totais,
         COUNT(*) FILTER (WHERE ${saleExpr} AND COALESCE(r.valor_contrato, 0) > 0)::int AS qcv_vendas_efetuadas,
         COUNT(*) FILTER (
           WHERE NOT (${saleExpr}) AND TRIM(r.situacao) NOT IN ('Vencida', 'Cancelada')
             AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_reservas_andamento,
         COUNT(*) FILTER (
           WHERE NOT (${saleExpr}) AND TRIM(r.situacao) IN ('Vencida', 'Cancelada')
             AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_reservas_perdidas,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) IN ('Distrato', 'Cancelada')
             AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_vendas_perdidas,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Vendida' AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_dur_vendida,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Contrato de Compra e Venda Gerado'
             AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_dur_contrato_gerado,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Envio Sienge' AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_dur_envio_sienge,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Distrato' AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_dur_distrato,
         COUNT(*) FILTER (
           WHERE ${saleExpr} AND TRIM(r.situacao) = 'Cancelada' AND COALESCE(r.valor_contrato, 0) > 0
         )::int AS qcv_dur_cancelada
       FROM cvcrm_reservas r
       WHERE ${whereSql}`,
      params,
    );

    const crosstabResult = await client.query(
      `SELECT
         TRIM(r.situacao) AS situacao,
         COUNT(*) FILTER (WHERE ${saleExpr})::int AS com_venda,
         COUNT(*) FILTER (WHERE NOT (${saleExpr}))::int AS sem_venda
       FROM cvcrm_reservas r
       WHERE ${whereSql}
         AND NULLIF(TRIM(r.situacao), '') IS NOT NULL
       GROUP BY 1
       ORDER BY 1`,
      params,
    );

    const rankingResult = await client.query(
      `WITH leads_by_corretor AS (
         SELECT
           NULLIF(TRIM(l.idcorretor), '') AS idcorretor,
           COUNT(*)::int AS leads
         FROM all_leads_unique l
         WHERE NULLIF(TRIM(l.idcorretor), '') IS NOT NULL
           AND TRIM(l.idcorretor) <> '0'
         GROUP BY 1
       ),
       vendas_by_corretor AS (
         SELECT
           NULLIF(TRIM(r.idcorretor::text), '') AS idcorretor,
           COUNT(*)::int AS vendas,
           COALESCE(SUM(r.valor_contrato), 0)::numeric AS valor_vendas,
           AVG(r.valor_contrato) FILTER (WHERE r.valor_contrato IS NOT NULL)::numeric AS ticket_medio
         FROM cvcrm_reservas r
         WHERE ${saleExpr}
           AND NULLIF(TRIM(r.idcorretor::text), '') IS NOT NULL
           AND TRIM(r.idcorretor::text) <> '0'
           AND ${whereSql}
         GROUP BY 1
       ),
       corretores_ids AS (
         SELECT idcorretor FROM leads_by_corretor
         UNION
         SELECT idcorretor FROM vendas_by_corretor
       )
       SELECT
         ci.idcorretor,
         c.nome,
         c.imobiliaria,
         COALESCE(l.leads, 0)::int AS leads,
         COALESCE(v.vendas, 0)::int AS vendas,
         COALESCE(v.valor_vendas, 0)::numeric AS valor_vendas,
         v.ticket_medio
       FROM corretores_ids ci
       LEFT JOIN leads_by_corretor l ON l.idcorretor = ci.idcorretor
       LEFT JOIN vendas_by_corretor v ON v.idcorretor = ci.idcorretor
       LEFT JOIN cvcrm_corretores c ON c.idcorretor::text = ci.idcorretor
       ORDER BY valor_vendas DESC, vendas DESC, leads DESC`,
      params,
    );

    const imobiliariasResult = await client.query(
      `SELECT
         COALESCE(
           NULLIF(TRIM(im.nome), ''),
           NULLIF(TRIM(r.idimobiliaria::text), ''),
           'Sem imobiliária'
         ) AS imobiliaria,
         COUNT(*)::int AS vendas,
         COALESCE(SUM(r.valor_contrato), 0)::numeric AS valor_vendas
       FROM cvcrm_reservas r
       LEFT JOIN cvcrm_imobiliarias im
         ON im.idimobiliaria::text = NULLIF(TRIM(r.idimobiliaria::text), '')
       WHERE ${saleExpr}
         AND ${whereSql}
       GROUP BY 1
       ORDER BY valor_vendas DESC, vendas DESC
       LIMIT 10`,
      params,
    );

    const comParams = [];
    const comWhereParts = ['1=1'];
    if (filters.empreendimento) {
      comParams.push(`%${String(filters.empreendimento).trim()}%`);
      comWhereParts.push(`TRIM(COALESCE(c.empreendimento, '')) ILIKE $${comParams.length}`);
    }
    if (filters.imobiliaria) {
      comParams.push(`%${String(filters.imobiliaria).trim()}%`);
      comWhereParts.push(`TRIM(COALESCE(c.imobiliaria, '')) ILIKE $${comParams.length}`);
    }
    const comWhereSql = comWhereParts.join(' AND ');

    let comissoesValor = 0;
    let comissoesPreenchidas = 0;
    try {
      const comissoesResult = await client.query(
        `SELECT
           COALESCE(
             SUM(c.valor_comissao) FILTER (WHERE TRIM(COALESCE(c.situacao, '')) <> 'Cancelada'),
             0
           )::numeric AS comissoes_valor,
           COUNT(*) FILTER (
             WHERE COALESCE(c.valor_comissao, 0) > 0
               AND TRIM(COALESCE(c.situacao, '')) <> 'Cancelada'
           )::int AS comissoes_preenchidas
         FROM cvcrm_comissoes c
         WHERE ${comWhereSql}`,
        comParams,
      );
      const comRow = comissoesResult.rows[0] ?? {};
      comissoesValor = Number(comRow.comissoes_valor ?? 0);
      comissoesPreenchidas = comRow.comissoes_preenchidas ?? 0;
    } catch (comErr) {
      if (comErr?.code !== '42P01') throw comErr;
    }

    const totaisRow = totaisResult.rows[0] ?? {};
    const reservasTotais = totaisRow.reservas_totais ?? 0;
    const totalEfetuadas = totaisRow.vendas_efetuadas ?? 0;
    const reservasSemVenda = totaisRow.reservas_sem_venda ?? 0;
    const vendasPerdidas = totaisRow.vendas_perdidas ?? 0;
    const reservasPerdidas = totaisRow.reservas_perdidas ?? 0;
    const vendasAtivas = Math.max(0, totalEfetuadas - vendasPerdidas);
    const reservasAndamento = Math.max(0, reservasSemVenda - reservasPerdidas);
    const durVendida = totaisRow.dur_vendida ?? 0;
    const durContratoGerado = totaisRow.dur_contrato_gerado ?? 0;
    const durEnvioSienge = totaisRow.dur_envio_sienge ?? 0;
    const durDistrato = totaisRow.dur_distrato ?? 0;
    const durCancelada = totaisRow.dur_cancelada ?? 0;
    const durNamedSum = durVendida + durContratoGerado + durEnvioSienge + durDistrato + durCancelada;
    const durOutros = Math.max(0, totalEfetuadas - durNamedSum);
    const valorEfetuado = Number(totaisRow.valor_efetuado ?? 0);
    const valorReservasTotais = Number(totaisRow.valor_reservas_totais ?? 0);
    const valorReservasPerdidas = Number(totaisRow.valor_reservas_perdidas ?? 0);
    const valorReservasAndamento = Number(totaisRow.valor_reservas_andamento ?? 0);
    const valorVendasPerdidas = Number(totaisRow.valor_vendas_perdidas ?? 0);
    const valorDurVendida = Number(totaisRow.valor_dur_vendida ?? 0);
    const valorDurContratoGerado = Number(totaisRow.valor_dur_contrato_gerado ?? 0);
    const valorDurEnvioSienge = Number(totaisRow.valor_dur_envio_sienge ?? 0);
    const valorDurDistrato = Number(totaisRow.valor_dur_distrato ?? 0);
    const valorDurCancelada = Number(totaisRow.valor_dur_cancelada ?? 0);
    const valorDurNamedSum =
      valorDurVendida + valorDurContratoGerado + valorDurEnvioSienge + valorDurDistrato + valorDurCancelada;
    const valorDurOutros = Math.max(0, valorEfetuado - valorDurNamedSum);
    const valorAtivosEmAndamento =
      valorReservasAndamento + valorDurContratoGerado + valorDurEnvioSienge;
    const valorPerdasTotais = valorVendasPerdidas + valorReservasPerdidas + valorAtivosEmAndamento;

    const qcvReservasAndamento = totaisRow.qcv_reservas_andamento ?? 0;
    const qcvReservasPerdidas = totaisRow.qcv_reservas_perdidas ?? 0;
    const qcvVendasEfetuadas = totaisRow.qcv_vendas_efetuadas ?? 0;
    const qcvVendasPerdidas = totaisRow.qcv_vendas_perdidas ?? 0;
    const qcvDurVendida = totaisRow.qcv_dur_vendida ?? 0;
    const qcvDurContratoGerado = totaisRow.qcv_dur_contrato_gerado ?? 0;
    const qcvDurEnvioSienge = totaisRow.qcv_dur_envio_sienge ?? 0;
    const qcvDurDistrato = totaisRow.qcv_dur_distrato ?? 0;
    const qcvDurCancelada = totaisRow.qcv_dur_cancelada ?? 0;
    const qcvVendasEmAndamento = qcvDurContratoGerado + qcvDurEnvioSienge;
    const qcvAtivosEmAndamento = qcvReservasAndamento + qcvVendasEmAndamento;

    const balde = (qtd, valor, qtdComValor) => ({ qtd, valor, qtd_com_valor: qtdComValor });

    const desdobramento = {
      reservas: {
        valor_total: valorReservasTotais,
        vendas_efetuadas: balde(totalEfetuadas, valorEfetuado, qcvVendasEfetuadas),
        reservas_andamento: balde(reservasAndamento, valorReservasAndamento, qcvReservasAndamento),
        reservas_perdidas: balde(reservasPerdidas, valorReservasPerdidas, qcvReservasPerdidas),
      },
      vendas: {
        valor_total: valorEfetuado,
        consolidadas: balde(durVendida, valorDurVendida, qcvDurVendida),
        em_andamento: balde(
          durContratoGerado + durEnvioSienge,
          valorDurContratoGerado + valorDurEnvioSienge,
          qcvVendasEmAndamento,
        ),
        revertidas: balde(
          durDistrato + durCancelada,
          valorDurDistrato + valorDurCancelada,
          qcvDurDistrato + qcvDurCancelada,
        ),
      },
      perdas: {
        valor_total: valorPerdasTotais,
        vendas_revertidas: balde(vendasPerdidas, valorVendasPerdidas, qcvVendasPerdidas),
        ativos_em_andamento: balde(
          reservasAndamento + durContratoGerado + durEnvioSienge,
          valorAtivosEmAndamento,
          qcvAtivosEmAndamento,
        ),
        reservas_perdidas: balde(reservasPerdidas, valorReservasPerdidas, qcvReservasPerdidas),
      },
    };

    const durabilidade = {
      total_efetuadas: totalEfetuadas,
      vendida: durVendida,
      contrato_gerado: durContratoGerado,
      envio_sienge: durEnvioSienge,
      distrato: durDistrato,
      cancelada: durCancelada,
      outros: durOutros,
      valor_vendida: valorDurVendida,
      valor_contrato_gerado: valorDurContratoGerado,
      valor_envio_sienge: valorDurEnvioSienge,
      valor_distrato: valorDurDistrato,
      valor_cancelada: valorDurCancelada,
      valor_outros: valorDurOutros,
    };

    return {
      totais: {
        reservas_totais: reservasTotais,
        vendas_efetuadas: totalEfetuadas,
        vendas_perdidas: vendasPerdidas,
        vendas_ativas: vendasAtivas,
        reservas_perdidas: reservasPerdidas,
        reservas_andamento: reservasAndamento,
        valor_efetuado: valorEfetuado,
        valor_reservas_totais: valorReservasTotais,
        valor_vendas_efetuadas: valorEfetuado,
        valor_reservas_andamento: valorReservasAndamento,
        valor_reservas_perdidas: valorReservasPerdidas,
        valor_vendas_perdidas: valorVendasPerdidas,
        valor_perdas_totais: valorPerdasTotais,
        ticket_medio:
          totaisRow.ticket_medio != null ? Number(totaisRow.ticket_medio) : null,
        corretores_que_venderam: totaisRow.corretores_que_venderam ?? 0,
        carteira_vigente: totaisRow.carteira_vigente ?? 0,
        distratos: totaisRow.distratos ?? 0,
        cancelados: totaisRow.cancelados ?? 0,
        comissoes_valor: comissoesValor,
        comissoes_preenchidas: comissoesPreenchidas,
        durabilidade,
        desdobramento,
      },
      ranking: rankingResult.rows.map((row) => ({
        idcorretor: row.idcorretor,
        nome: row.nome ?? null,
        imobiliaria: row.imobiliaria ?? null,
        leads: row.leads ?? 0,
        vendas: row.vendas ?? 0,
        valor_vendas: Number(row.valor_vendas ?? 0),
        ticket_medio: row.ticket_medio != null ? Number(row.ticket_medio) : null,
      })),
      ranking_imobiliarias: imobiliariasResult.rows.map((row) => ({
        imobiliaria: row.imobiliaria,
        vendas: row.vendas ?? 0,
        valor_vendas: Number(row.valor_vendas ?? 0),
      })),
      fluxo_crosstab: {
        por_situacao: crosstabResult.rows.map((row) => ({
          situacao: row.situacao,
          com_venda: row.com_venda ?? 0,
          sem_venda: row.sem_venda ?? 0,
        })),
      },
    };
  } catch (err) {
    if (err?.code === '42P01') {
      return {
        totais: {
          reservas_totais: 0,
          vendas_efetuadas: 0,
          vendas_perdidas: 0,
          vendas_ativas: 0,
          reservas_perdidas: 0,
          reservas_andamento: 0,
          valor_efetuado: 0,
          valor_reservas_totais: 0,
          valor_vendas_efetuadas: 0,
          valor_reservas_andamento: 0,
          valor_reservas_perdidas: 0,
          valor_vendas_perdidas: 0,
          valor_perdas_totais: 0,
          ticket_medio: null,
          corretores_que_venderam: 0,
          carteira_vigente: 0,
          distratos: 0,
          cancelados: 0,
          comissoes_valor: 0,
          comissoes_preenchidas: 0,
          durabilidade: {
            total_efetuadas: 0,
            vendida: 0,
            contrato_gerado: 0,
            envio_sienge: 0,
            distrato: 0,
            cancelada: 0,
            outros: 0,
            valor_vendida: 0,
            valor_contrato_gerado: 0,
            valor_envio_sienge: 0,
            valor_distrato: 0,
            valor_cancelada: 0,
            valor_outros: 0,
          },
          desdobramento: {
            reservas: {
              valor_total: 0,
              vendas_efetuadas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              reservas_andamento: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              reservas_perdidas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
            },
            vendas: {
              valor_total: 0,
              consolidadas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              em_andamento: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              revertidas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
            },
            perdas: {
              valor_total: 0,
              vendas_revertidas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              ativos_em_andamento: { qtd: 0, valor: 0, qtd_com_valor: 0 },
              reservas_perdidas: { qtd: 0, valor: 0, qtd_com_valor: 0 },
            },
          },
        },
        ranking: [],
        ranking_imobiliarias: [],
        fluxo_crosstab: { por_situacao: [] },
      };
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}