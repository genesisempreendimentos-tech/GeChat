import pg from 'pg';
import { getCvcrmCredentials, getNeonLeadsUrl } from './cvcrmBatchSync.mjs';

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
  return {
    idcorretor: toBigintId(raw.idcorretor),
    nome: toSafeString(raw.nome ?? raw.corretor ?? raw.name) || null,
    documento: toSafeString(raw.documento) || null,
    idimobiliaria: toSafeString(raw.idimobiliaria) || null,
    imobiliaria: toSafeString(raw.imobiliaria) || null,
    payload: raw,
  };
}

export function parseCvdwImobiliariaRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    idimobiliaria: toBigintId(raw.idimobiliaria),
    nome: toSafeString(raw.nome ?? raw.imobiliaria ?? raw.name) || null,
    cnpj: toSafeString(raw.cnpj) || null,
    payload: raw,
  };
}

async function upsertCorretor(client, parsed) {
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
      parsed.nome,
      parsed.documento,
      parsed.idimobiliaria,
      parsed.imobiliaria,
      JSON.stringify(parsed.payload ?? {}),
    ],
  );
}

async function upsertImobiliaria(client, parsed) {
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
      parsed.nome,
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

export async function getCompetenciaReport() {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    const result = await client.query(
      `WITH leads_by_corretor AS (
         SELECT
           NULLIF(TRIM(l.idcorretor), '') AS idcorretor,
           COUNT(*)::int AS total_leads
         FROM leads l
         WHERE NULLIF(TRIM(l.idcorretor), '') IS NOT NULL
         GROUP BY 1
       ),
       vendas_by_corretor AS (
         SELECT
           NULLIF(TRIM(r.idcorretor), '') AS idcorretor,
           COUNT(*)::int AS total_vendas,
           COALESCE(SUM(r.valor_contrato), 0)::numeric AS soma_valor
         FROM cvcrm_reservas r
         WHERE NULLIF(TRIM(r.idcorretor), '') IS NOT NULL
           AND (
             LOWER(COALESCE(r.situacao, '')) LIKE '%vendida%'
             OR r.aprovada IS TRUE
           )
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
         COALESCE(l.total_leads, 0)::int AS total_leads,
         COALESCE(v.total_vendas, 0)::int AS total_vendas,
         COALESCE(v.soma_valor, 0)::numeric AS soma_valor
       FROM corretores_ids ci
       LEFT JOIN leads_by_corretor l ON l.idcorretor = ci.idcorretor
       LEFT JOIN vendas_by_corretor v ON v.idcorretor = ci.idcorretor
       LEFT JOIN cvcrm_corretores c ON c.idcorretor::text = ci.idcorretor
       ORDER BY soma_valor DESC, total_vendas DESC, total_leads DESC`,
    );
    return result.rows;
  } catch (err) {
    if (err?.code === '42P01') return [];
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}