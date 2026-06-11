import pg from 'pg';

export const CVCRM_WEBHOOK_TABLES = [
  'leads_solar_bosque',
  'leads_oasis_ii',
  'leads_kastell',
  'leads_nature',
  'leads_oasis_i',
  'leads_solar_bellavista',
  'leads_solar_flores',
  'leads_vita',
  'leads_flow',
  'leads_aniversario_208_anos',
  'leads_gesite',
  'leads_blackgenesis',
  'leads_old',
];

const TABLES_WITH_UPDATED_AT = new Set(['leads_solar_bosque']);

function trimEnv(key) {
  return String(process.env[key] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function getNeonLeadsUrl() {
  return process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL || null;
}

function getCvcrmCredentials() {
  return {
    email: trimEnv('CVCRM_EMAIL'),
    token: trimEnv('CVCRM_TOKEN'),
  };
}

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return String(value);
}

function extractLeadPayload(body) {
  if (!body) return null;
  if (Array.isArray(body)) return body[0] ?? null;
  if (body.lead && typeof body.lead === 'object') return body.lead;
  return body;
}

function resolveStageDateColumns(stage, situation, isSold) {
  const texts = [stage, situation].filter(Boolean).join(' ');
  const columns = [];

  if (isSold || /venda/i.test(texts)) columns.push('data_venda');
  if (/proposta/i.test(texts)) columns.push('data_proposta');

  if (/cr[eé]dito/i.test(texts) || /financiamento/i.test(texts) || /an[aá]lise/i.test(texts)) {
    columns.push('data_analise_credito_inicio');
    if (
      /aprov/i.test(texts) ||
      /reprov/i.test(texts) ||
      /negad/i.test(texts) ||
      /recus/i.test(texts) ||
      /indefer/i.test(texts)
    ) {
      columns.push('data_analise_credito_fim');
    }
  }

  if (/visita/i.test(texts)) {
    if (/agendad/i.test(texts)) {
      columns.push('data_visita_agendada');
    } else {
      columns.push('data_visita_realizada');
    }
  }

  if (/atendimento/i.test(texts) || /contato/i.test(texts) || /corretor/i.test(texts)) {
    columns.push('data_primeiro_atendimento');
  }

  if (/perdid/i.test(texts) || /descart/i.test(texts)) columns.push('data_perdido');

  return [...new Set(columns)];
}

export function parseCvcrmLeadResponse(body) {
  const lead = extractLeadPayload(body);
  if (!lead || typeof lead !== 'object') {
    return {
      cvcrm_status: null,
      cvcrm_situation: null,
      cvcrm_stage: null,
      cvcrm_is_sold: false,
    };
  }

  const situation = toSafeString(
    lead.situacao ?? lead.situation ?? lead.situacao_atual ?? lead.cvcrm_situation,
  );
  const stage = toSafeString(lead.estagio ?? lead.stage ?? lead.fase ?? lead.cvcrm_stage);
  const status = toSafeString(lead.status ?? lead.situacao_lead ?? lead.cvcrm_status);
  const cvcrm_is_sold = /venda/i.test(situation) || /venda/i.test(stage);

  return {
    cvcrm_status: status || null,
    cvcrm_situation: situation || null,
    cvcrm_stage: stage || null,
    cvcrm_is_sold,
  };
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );
  return result.rowCount > 0;
}

const CVCRM_LEAD_URL = 'https://genesis.cvcrm.com.br/api/v1/lead';
const CVCRM_LEADS_URL = 'https://genesis.cvcrm.com.br/api/v1/leads';

async function cvcrmApiRequest(method, url, body = undefined) {
  const { email, token } = getCvcrmCredentials();
  if (!email || !token) {
    throw new Error('CVCRM_EMAIL e CVCRM_TOKEN não configurados.');
  }

  const headers = {
    accept: 'application/json',
    email,
    token,
  };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsedBody = null;
  try {
    parsedBody = text ? JSON.parse(text) : null;
  } catch {
    parsedBody = text || null;
  }

  const result = { status: res.status, body: parsedBody, text, method, url };
  console.log(
    `[cvcrm/webhook] CVCRM ${method} ${url} → HTTP ${res.status}`,
    text?.slice(0, 4000) ?? '(vazio)',
  );
  return result;
}

async function fetchCvcrmLeadById(idlead) {
  const id = String(idlead);
  const postUrl = `${CVCRM_LEAD_URL}?idlead=${encodeURIComponent(id)}`;
  const postResponse = await cvcrmApiRequest('POST', postUrl, { idlead: Number(id) || id });

  if (postResponse.status >= 200 && postResponse.status < 300) {
    return postResponse;
  }

  const getUrl = `${CVCRM_LEADS_URL}?idlead=${encodeURIComponent(id)}`;
  const getResponse = await cvcrmApiRequest('GET', getUrl);

  if (getResponse.status >= 200 && getResponse.status < 300) {
    return getResponse;
  }

  throw new Error(
    `CVCRM indisponível: POST ${postUrl} → ${postResponse.status} (${postResponse.text || 'sem body'}); ` +
      `GET ${getUrl} → ${getResponse.status} (${getResponse.text || 'sem body'})`,
  );
}

async function updateLeadTable(client, tableName, idlead, fields, cvcrmResponse) {
  const touchUpdatedAt = TABLES_WITH_UPDATED_AT.has(tableName) ? ', updated_at = now()' : '';
  const stageDateColumns = resolveStageDateColumns(
    fields.cvcrm_stage,
    fields.cvcrm_situation,
    fields.cvcrm_is_sold,
  );
  const stageDateSet = stageDateColumns
    .map((col) => `, ${col} = COALESCE(${col}, now())`)
    .join('');
  const result = await client.query(
    `UPDATE ${tableName}
     SET cvcrm_status = $1,
         cvcrm_situation = $2,
         cvcrm_stage = $3,
         cvcrm_last_update = now(),
         cvcrm_payload = $4::jsonb,
         cvcrm_is_sold = $5${stageDateSet}${touchUpdatedAt}
     WHERE cvcrm_lead_id = $6
     RETURNING id, empreendimento`,
    [
      fields.cvcrm_status,
      fields.cvcrm_situation,
      fields.cvcrm_stage,
      JSON.stringify(cvcrmResponse ?? {}),
      fields.cvcrm_is_sold,
      String(idlead),
    ],
  );
  const row = result.rows[0];
  return {
    count: result.rowCount ?? 0,
    leadUuid: row?.id ?? null,
    empreendimento: row?.empreendimento ?? null,
  };
}

async function logWebhook(client, {
  idlead,
  payload,
  cvcrmResponse,
  leadTable,
  leadUuid,
  empreendimento,
  processed,
  errorMessage,
}) {
  const combinedPayload = {
    received: payload ?? null,
    cvcrm: cvcrmResponse
      ? {
          status: cvcrmResponse.status,
          method: cvcrmResponse.method,
          url: cvcrmResponse.url,
          body: cvcrmResponse.body ?? null,
        }
      : null,
  };

  await client.query(
    `INSERT INTO cvcrm_webhook_logs (
       received_at,
       lead_uuid,
       processed,
       processed_at,
       payload,
       error_message,
       event_type,
       empreendimento,
       cvcrm_lead_id,
       lead_table
     ) VALUES (
       now(),
       $1,
       $2,
       now(),
       $3::jsonb,
       $4,
       'lead_update',
       $5,
       $6,
       $7
     )`,
    [
      leadUuid,
      processed,
      JSON.stringify(combinedPayload),
      errorMessage || null,
      empreendimento || null,
      String(idlead),
      leadTable,
    ],
  );
}

export async function processCvcrmWebhook(payload) {
  const idlead = payload?.idlead ?? payload?.idLead ?? payload?.id;
  if (idlead === null || idlead === undefined || toSafeString(idlead) === '') {
    console.warn('[cvcrm/webhook] Payload sem idlead:', payload);
    return { idlead: null, updatedTables: [], error: 'idlead ausente' };
  }

  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.error('[cvcrm/webhook] NEON_LEADS_DATABASE_URL não configurada.');
    return { idlead, updatedTables: [], error: 'Neon não configurado' };
  }

  let cvcrmResponse = null;
  let fields = parseCvcrmLeadResponse(null);
  let fetchError = null;

  try {
    cvcrmResponse = await fetchCvcrmLeadById(idlead);
    fields = parseCvcrmLeadResponse(cvcrmResponse.body);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
    console.error(`[cvcrm/webhook] Falha ao consultar lead ${idlead}:`, fetchError);
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  const updatedTables = [];
  let leadUuid = null;
  let empreendimento = null;

  try {
    await client.connect();

    for (const tableName of CVCRM_WEBHOOK_TABLES) {
      try {
        if (!(await tableExists(client, tableName))) continue;
        const updateResult = await updateLeadTable(
          client,
          tableName,
          idlead,
          fields,
          cvcrmResponse?.body ?? null,
        );
        if (updateResult.count > 0) {
          updatedTables.push(tableName);
          if (!leadUuid) {
            leadUuid = updateResult.leadUuid;
            empreendimento = updateResult.empreendimento;
          }
        }
      } catch (err) {
        if (err?.code === '42P01' || err?.code === '42703') continue;
        console.error(`[cvcrm/webhook] Erro ao atualizar ${tableName}:`, err?.message ?? err);
      }
    }

    if (updatedTables.length > 0) {
      console.log(`[cvcrm/webhook] idlead=${idlead} → ${updatedTables.join(', ')}`);
    }

    try {
      await logWebhook(client, {
        idlead,
        payload,
        cvcrmResponse,
        leadTable: updatedTables[0] || null,
        leadUuid,
        empreendimento,
        processed: !fetchError,
        errorMessage: fetchError,
      });
    } catch (err) {
      if (err?.code !== '42P01' && err?.code !== '42703') {
        console.error('[cvcrm/webhook] Erro ao gravar cvcrm_webhook_logs:', err?.message ?? err);
      }
    }
  } finally {
    await client.end().catch(() => {});
  }

  return { idlead, updatedTables, error: fetchError };
}
