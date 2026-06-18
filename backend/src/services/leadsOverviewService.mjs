import pg from 'pg';
import { getNeonLeadsUrl } from '../lib/neonLeads.mjs';
import { computeLeadQualificacao } from '../lib/leadQualificacao.mjs';
import {
  normalizeCanalBucketLabel,
  normalizeFonteLabel,
  SQL_IS_MARKETING_BUCKET,
  SQL_RESOLVE_BUCKET_FROM_ALL_LEADS,
} from '../lib/leadsCanalMap.mjs';
import {
  aggregateGenesisEmpreendimentoLabels,
  loadEmpreendimentoResolver,
  orderGenesisEmpreendimentoSeries,
  resolveEmpreendimentoInteresseGenesis,
  resolveGenesisEmpreendimentoColor,
} from './empreendimentoResolver.mjs';
import { toTitleCasePtBr } from '../lib/toTitleCasePtBr.mjs';

function nullableString(value) {
  if (value == null) return null;
  const t = String(value).trim();
  return t || null;
}

function nullableDateIso(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function formatPersonName(value) {
  const raw = nullableString(value);
  if (!raw) return null;
  return toTitleCasePtBr(raw) ?? raw;
}

/** Empreendimentos canônicos Genesis (aliases mapeados) para exibição na listagem. */
function resolveGenesisInteresseDisplay(rawValues) {
  const items = Array.isArray(rawValues)
    ? rawValues
    : rawValues != null
      ? [rawValues]
      : [];
  const labels = [];
  const seen = new Set();
  for (const item of items) {
    for (const label of resolveEmpreendimentoInteresseGenesis(item)) {
      if (!label || seen.has(label)) continue;
      seen.add(label);
      labels.push(label);
    }
  }
  return labels.length ? labels.join('; ') : null;
}

function pct(count, base) {
  if (!base) return 0;
  return Math.round((count / base) * 1000) / 10;
}

function parseFilters(query = {}) {
  const hasDateRange =
    (query.created_de != null && String(query.created_de).trim() !== '') ||
    (query.created_ate != null && String(query.created_ate).trim() !== '');

  let createdDe = null;
  let createdAte = null;
  if (hasDateRange) {
    const today = new Date();
    const defaultAte = today.toISOString().slice(0, 10);
    const defaultDe = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    createdDe = query.created_de ? String(query.created_de).trim() : defaultDe;
    createdAte = query.created_ate ? String(query.created_ate).trim() : defaultAte;
  }
  const canal = query.canal ? String(query.canal).trim() : '';
  const fonte = ['marketing', 'externo', 'todos'].includes(String(query.fonte ?? ''))
    ? String(query.fonte)
    : 'todos';
  const empreendimento = query.empreendimento ? String(query.empreendimento).trim() : '';
  const situacaoCv = query.situacao_cv ? String(query.situacao_cv).trim() : '';
  const timelineGrain = query.timeline_grain === 'pessoas' ? 'pessoas' : 'cadastros';
  const busca = query.busca ? String(query.busca).trim() : '';
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(query.pageSize ?? '25'), 10) || 25));

  return {
    createdDe,
    createdAte,
    canal,
    fonte,
    empreendimento,
    situacaoCv,
    timelineGrain,
    busca,
    page,
    pageSize,
  };
}

function buildCadastroFilterSql(filters, alias = 'al') {
  const params = [];
  const parts = ['1=1'];

  if (filters.createdDe) {
    params.push(filters.createdDe);
    parts.push(`${alias}.created_at >= $${params.length}::date`);
  }
  if (filters.createdAte) {
    params.push(filters.createdAte);
    parts.push(`${alias}.created_at < ($${params.length}::date + interval '1 day')`);
  }
  if (filters.empreendimento) {
    params.push(`%${filters.empreendimento}%`);
    parts.push(`TRIM(COALESCE(${alias}.empreendimento_interesse, '')) ILIKE $${params.length}`);
  }
  if (filters.situacaoCv) {
    params.push(filters.situacaoCv);
    parts.push(`TRIM(COALESCE(${alias}.cvcrm_situation, '')) = $${params.length}`);
  }
  if (filters.fonte === 'marketing') {
    parts.push(SQL_IS_MARKETING_BUCKET.replace(/al\./g, `${alias}.`));
  } else if (filters.fonte === 'externo') {
    parts.push(`NOT (${SQL_IS_MARKETING_BUCKET.replace(/al\./g, `${alias}.`)})`);
  }
  if (filters.canal) {
    params.push(filters.canal);
    parts.push(
      `(${SQL_RESOLVE_BUCKET_FROM_ALL_LEADS.replace(/al\./g, `${alias}.`)}) = $${params.length}`,
    );
  }

  return { whereSql: parts.join(' AND '), params };
}

function buildUniqueFilterSql(filters, alias = 'u', paramOffset = 0) {
  const params = [];
  const parts = ['1=1'];

  if (filters.createdDe) {
    params.push(filters.createdDe);
    parts.push(`${alias}.created_at >= $${paramOffset + params.length}::date`);
  }
  if (filters.createdAte) {
    params.push(filters.createdAte);
    parts.push(`${alias}.created_at < ($${paramOffset + params.length}::date + interval '1 day')`);
  }
  if (filters.empreendimento) {
    params.push(`%${filters.empreendimento}%`);
    parts.push(`EXISTS (
      SELECT 1 FROM unnest(${alias}.empreendimento_interesse) AS emp
      WHERE TRIM(COALESCE(emp, '')) ILIKE $${paramOffset + params.length}
    )`);
  }
  if (filters.situacaoCv) {
    params.push(filters.situacaoCv);
    parts.push(`TRIM(COALESCE(${alias}.cvcrm_situation, '')) = $${paramOffset + params.length}`);
  }
  if (filters.fonte === 'marketing') {
    parts.push(`${alias}.fonte = 'marketing'`);
  } else if (filters.fonte === 'externo') {
    parts.push(`${alias}.fonte = 'externo'`);
  }
  if (filters.canal) {
    params.push(filters.canal);
    parts.push(`${alias}.canal_bucket = $${paramOffset + params.length}`);
  }

  return { whereSql: parts.join(' AND '), params };
}

function metric(count, base) {
  return { count, percent: pct(count, base) };
}

async function fetchBignumbers(client, filters) {
  const cad = buildCadastroFilterSql(filters, 'al');
  const uni = buildUniqueFilterSql(filters, 'u', 0);

  const { rows: [cadRow] } = await client.query(
    `SELECT COUNT(*)::int AS n FROM all_leads al WHERE ${cad.whereSql}`,
    cad.params,
  );
  const { rows: [uniRow] } = await client.query(
    `SELECT
       COUNT(*)::int AS leads_unicos,
       COUNT(*) FILTER (WHERE u.profile_completed)::int AS qualificados,
       COUNT(*) FILTER (WHERE u.has_reserva)::int AS converteram_reserva,
       COUNT(*) FILTER (WHERE u.has_venda)::int AS viraram_venda,
       COUNT(*) FILTER (WHERE u.has_reserva AND u.fonte = 'marketing')::int AS reservas_marketing,
       COUNT(*) FILTER (WHERE u.has_reserva AND u.fonte = 'externo')::int AS reservas_externas
     FROM all_leads_unique u
     WHERE ${uni.whereSql}`,
    uni.params,
  );

  const leadsTotais = cadRow?.n ?? 0;
  const leadsUnicos = uniRow?.leads_unicos ?? 0;
  const duplicados = Math.max(0, leadsTotais - leadsUnicos);
  const qualificados = uniRow?.qualificados ?? 0;
  const converteramReserva = uniRow?.converteram_reserva ?? 0;
  const reservasMarketing = uniRow?.reservas_marketing ?? 0;
  const reservasExternas = uniRow?.reservas_externas ?? 0;

  return {
    leads_totais: metric(leadsTotais, leadsTotais),
    leads_unicos: metric(leadsUnicos, leadsTotais),
    duplicados: metric(duplicados, leadsTotais),
    qualificados: metric(qualificados, leadsUnicos),
    converteram_reserva: metric(converteramReserva, leadsUnicos),
    viraram_venda: metric(uniRow?.viraram_venda ?? 0, leadsUnicos),
    reservas_marketing: metric(reservasMarketing, leadsUnicos),
    reservas_externas: metric(reservasExternas, leadsUnicos),
  };
}

async function fetchDistribuicao(client, filters) {
  const cad = buildCadastroFilterSql(filters, 'al');
  const uni = buildUniqueFilterSql(filters, 'u', 0);

  const bucketCadSql = `
    SELECT (${SQL_RESOLVE_BUCKET_FROM_ALL_LEADS}) AS canal, COUNT(*)::int AS cadastros
    FROM all_leads al
    WHERE ${cad.whereSql}
    GROUP BY 1 ORDER BY cadastros DESC, canal
  `;
  const bucketPessoasSql = `
    SELECT u.canal_bucket AS canal, COUNT(*)::int AS pessoas
    FROM all_leads_unique u
    WHERE ${uni.whereSql}
    GROUP BY 1 ORDER BY pessoas DESC, canal
  `;
  const fonteCadSql = `
    SELECT
      CASE WHEN ${SQL_IS_MARKETING_BUCKET}
        THEN 'Marketing' ELSE 'Externo' END AS fonte,
      COUNT(*)::int AS cadastros
    FROM all_leads al WHERE ${cad.whereSql}
    GROUP BY 1 ORDER BY fonte
  `;
  const fontePessoasSql = `
    SELECT
      CASE WHEN u.fonte = 'marketing' THEN 'Marketing' ELSE 'Externo' END AS fonte,
      COUNT(*)::int AS pessoas
    FROM all_leads_unique u WHERE ${uni.whereSql}
    GROUP BY 1 ORDER BY fonte
  `;

  const { rows: canalCadRows } = await client.query(bucketCadSql, cad.params);
  const { rows: canalPessoasRows } = await client.query(bucketPessoasSql, uni.params);
  const { rows: fonteCadRows } = await client.query(fonteCadSql, cad.params);
  const { rows: fontePessoasRows } = await client.query(fontePessoasSql, uni.params);

  const canalMap = new Map();
  for (const row of canalCadRows) {
    const canal = normalizeCanalBucketLabel(row.canal);
    const prev = canalMap.get(canal) ?? { canal, cadastros: 0, pessoas: 0 };
    prev.cadastros += row.cadastros;
    canalMap.set(canal, prev);
  }
  for (const row of canalPessoasRows) {
    const canal = normalizeCanalBucketLabel(row.canal);
    const prev = canalMap.get(canal) ?? { canal, cadastros: 0, pessoas: 0 };
    prev.pessoas += row.pessoas;
    canalMap.set(canal, prev);
  }

  const fonteMap = new Map();
  for (const row of fonteCadRows) {
    const fonte = normalizeFonteLabel(row.fonte);
    const prev = fonteMap.get(fonte) ?? { fonte, cadastros: 0, pessoas: 0 };
    prev.cadastros += row.cadastros;
    fonteMap.set(fonte, prev);
  }
  for (const row of fontePessoasRows) {
    const fonte = normalizeFonteLabel(row.fonte);
    const prev = fonteMap.get(fonte) ?? { fonte, cadastros: 0, pessoas: 0 };
    prev.pessoas += row.pessoas;
    fonteMap.set(fonte, prev);
  }

  await loadEmpreendimentoResolver(client);

  const { rows: empCadRows } = await client.query(
    `SELECT al.empreendimento_interesse FROM all_leads al WHERE ${cad.whereSql}`,
    cad.params,
  );
  const { rows: empPessoasRows } = await client.query(
    `SELECT u.empreendimento_interesse FROM all_leads_unique u WHERE ${uni.whereSql}`,
    uni.params,
  );

  const cadEmpMap = aggregateGenesisEmpreendimentoLabels(
    empCadRows.map((row) => row.empreendimento_interesse),
  );
  const pessoasEmpMap = aggregateGenesisEmpreendimentoLabels(
    empPessoasRows.map((row) => row.empreendimento_interesse),
  );

  const empKeys = new Set([...cadEmpMap.keys(), ...pessoasEmpMap.keys()]);
  const porEmpreendimento = [...empKeys]
    .map((empreendimento) => ({
      empreendimento,
      cadastros: cadEmpMap.get(empreendimento) ?? 0,
      pessoas: pessoasEmpMap.get(empreendimento) ?? 0,
    }))
    .sort((a, b) => b.cadastros - a.cadastros);

  return {
    por_canal: [...canalMap.values()].sort((a, b) => b.cadastros - a.cadastros),
    por_fonte: [...fonteMap.values()].sort((a, b) => b.cadastros - a.cadastros),
    por_empreendimento: porEmpreendimento,
  };
}

function slugEmpreendimentoKey(name) {
  const slug = String(name ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug ? `emp_${slug}` : 'emp_nao_informado';
}

function resolveLabelsForRaw(raw) {
  return resolveEmpreendimentoInteresseGenesis(raw);
}

async function buildTimeline(client, filters, cad, uni) {
  const grain = filters.timelineGrain;

  let rawRows;
  if (grain === 'pessoas') {
    const sql = `
      SELECT
        to_char(date_trunc('day', u.created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS dia,
        emp AS empreendimento_raw
      FROM all_leads_unique u
      CROSS JOIN LATERAL unnest(
        CASE
          WHEN cardinality(u.empreendimento_interesse) > 0 THEN u.empreendimento_interesse
          ELSE ARRAY[NULL::text]
        END
      ) AS emp
      WHERE ${uni.whereSql}
    `;
    const res = await client.query(sql, uni.params);
    rawRows = res.rows;
  } else {
    const sql = `
      SELECT
        to_char(date_trunc('day', al.created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM-DD') AS dia,
        al.empreendimento_interesse AS empreendimento_raw
      FROM all_leads al
      WHERE ${cad.whereSql}
    `;
    const res = await client.query(sql, cad.params);
    rawRows = res.rows;
  }

  await loadEmpreendimentoResolver(client);

  const totalsByLabel = new Map();
  const byDay = new Map();

  for (const row of rawRows) {
    const labels = resolveLabelsForRaw(row.empreendimento_raw);
    for (const label of labels) {
      totalsByLabel.set(label, (totalsByLabel.get(label) ?? 0) + 1);
      if (!byDay.has(row.dia)) byDay.set(row.dia, { dia: row.dia });
      const point = byDay.get(row.dia);
      point[label] = (point[label] ?? 0) + 1;
    }
  }

  const orderedSeries = orderGenesisEmpreendimentoSeries(totalsByLabel);

  const points = [...byDay.values()].sort((a, b) => a.dia.localeCompare(b.dia));
  for (const point of points) {
    for (const name of orderedSeries) {
      if (point[name] === undefined) point[name] = 0;
    }
  }

  const seriesMeta = orderedSeries.map((name) => ({
    dataKey: slugEmpreendimentoKey(name),
    name,
    color: resolveGenesisEmpreendimentoColor(name),
  }));

  const pointsWithKeys = points.map((point) => {
    const next = { dia: point.dia };
    for (const { dataKey, name } of seriesMeta) {
      next[dataKey] = point[name] ?? 0;
    }
    return next;
  });

  return { series: seriesMeta, points: pointsWithKeys, grain };
}

async function fetchCharts(client, filters) {
  const cad = buildCadastroFilterSql(filters, 'al');
  const uni = buildUniqueFilterSql(filters, 'u', 0);
  await loadEmpreendimentoResolver(client);
  const distribuicao = await fetchDistribuicao(client, filters);
  const timeline = await buildTimeline(client, filters, cad, uni);
  return { distribuicao, timeline };
}

async function getList(client, filters) {
  await loadEmpreendimentoResolver(client);
  const uni = buildUniqueFilterSql(filters, 'u', 0);
  const params = [...uni.params];
  let searchSql = '1=1';

  if (filters.busca) {
    params.push(`%${filters.busca}%`);
    const idx = params.length;
    params.push(String(filters.busca).trim());
    const idxExact = params.length;
    searchSql = `(
      EXISTS (SELECT 1 FROM unnest(u.name) n WHERE n ILIKE $${idx})
      OR EXISTS (SELECT 1 FROM unnest(u.email) e WHERE e ILIKE $${idx})
      OR EXISTS (SELECT 1 FROM unnest(u.phone) p WHERE p ILIKE $${idx})
      OR u.person_id::text ILIKE $${idx}
      OR UPPER(TRIM(u.geleads_id)) = UPPER($${idxExact})
      OR u.geleads_id ILIKE $${idx}
    )`;
  }

  const whereFull = `${uni.whereSql} AND (${searchSql})`;

  const countSql = `SELECT COUNT(*)::int AS total FROM all_leads_unique u WHERE ${whereFull}`;
  const { rows: [countRow] } = await client.query(countSql, params);
  const total = countRow?.total ?? 0;

  const offset = (filters.page - 1) * filters.pageSize;
  params.push(filters.pageSize);
  const limitIdx = params.length;
  params.push(offset);
  const offsetIdx = params.length;

  const listSql = `
    SELECT
      u.person_id::text AS person_id,
      u.geleads_id,
      NULLIF(TRIM(u.name[1]), '') AS nome,
      NULLIF(TRIM(u.email[1]), '') AS email,
      NULLIF(TRIM(u.phone[1]), '') AS telefone,
      u.empreendimento_interesse,
      NULLIF(TRIM(u.canal_bucket), '') AS canal_bucket,
      NULLIF(TRIM(u.canal[1]), '') AS canal_raw,
      NULLIF(TRIM(u.parameter[1]), '') AS parameter,
      NULLIF(TRIM(u.cvcrm_lead_id), '') AS cvcrm_lead_id,
      u.birth_date,
      NULLIF(TRIM(u.relationship_status), '') AS relacionamento,
      NULLIF(TRIM(u.monthly_investment), '') AS investimento,
      NULLIF(TRIM(u.current_city), '') AS cidade,
      NULLIF(TRIM(u.profile_type), '') AS perfil_tipo,
      NULLIF(TRIM(u.children_status), '') AS children_status,
      NULLIF(TRIM(cr.nome), '') AS responsavel,
      u.created_at
    FROM all_leads_unique u
    LEFT JOIN cvcrm_corretores cr
      ON NULLIF(TRIM(u.idcorretor), '') IS NOT NULL
     AND cr.idcorretor::text = NULLIF(TRIM(u.idcorretor), '')
    WHERE ${whereFull}
    ORDER BY u.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const { rows } = await client.query(listSql, params);

  return {
    rows: rows.map((r) => {
      const personId = String(r.person_id);
      const geleadsId = nullableString(r.geleads_id);
      const qualificacaoInput = {
        email: r.email,
        telefone: r.telefone,
        relacionamento: r.relacionamento,
        investimento: r.investimento,
        cidade: r.cidade,
        birth_date: r.birth_date,
        perfil_tipo: r.perfil_tipo,
      };

      return {
        person_id: personId,
        geleads_id: geleadsId,
        id_amigavel: geleadsId,
        codigo: geleadsId,
        nome: formatPersonName(r.nome) ?? 'Sem nome',
        email: nullableString(r.email),
        telefone: nullableString(r.telefone),
        empreendimento_interesse: resolveGenesisInteresseDisplay(r.empreendimento_interesse),
        canal_bucket: nullableString(r.canal_bucket) ?? 'Outros',
        canal_raw: nullableString(r.canal_raw) ?? nullableString(r.canal_bucket) ?? 'Outros',
        parameter: nullableString(r.parameter),
        cvcrm_lead_id: nullableString(r.cvcrm_lead_id),
        status_qualificacao: computeLeadQualificacao(qualificacaoInput),
        birth_date: nullableDateIso(r.birth_date),
        relacionamento: nullableString(r.relacionamento),
        investimento: nullableString(r.investimento),
        cidade: formatPersonName(r.cidade),
        perfil_tipo: nullableString(r.perfil_tipo),
        children_status: nullableString(r.children_status),
        observacoes: nullableString(r.children_status),
        responsavel: formatPersonName(r.responsavel),
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      };
    }),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

async function withClient(fn) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) throw new Error('NEON_LEADS_DATABASE_URL não configurada.');
  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

export async function getLeadsOverviewBignumbers(query = {}) {
  const filters = parseFilters(query);
  return withClient((client) => fetchBignumbers(client, filters));
}

export async function getLeadsOverviewCharts(query = {}) {
  const filters = parseFilters(query);
  return withClient((client) => fetchCharts(client, filters));
}

export async function getLeadsOverview(query = {}) {
  const filters = parseFilters(query);
  return withClient(async (client) => {
    const bignumbers = await fetchBignumbers(client, filters);
    const charts = await fetchCharts(client, filters);
    return { bignumbers, ...charts };
  });
}

export async function getLeadsList(query = {}) {
  const filters = parseFilters(query);
  return withClient((client) => getList(client, filters));
}
