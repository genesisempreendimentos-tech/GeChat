import pg from 'pg';
import { resolveEmpreendimentoPage } from '../leadEmpreendimento.mjs';
import { isIgnoredLeadSource } from '../ignoredLeadSources.mjs';
import { syncLeadsFromSources } from './leadSourceSync.mjs';

const LEAD_STATUSES = ['novo', 'contato', 'qualificado', 'negociacao', 'ganho', 'perdido'];

function getNeonLeadsUrl() {
  return (
    process.env.NEON_LEADS_DATABASE_URL ||
    process.env.NEON_GETEAMS_DATABASE_URL ||
    process.env.DATABASE_URL ||
    null
  );
}

function toIso(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function toIsoOptional(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapLeadCodigo(row) {
  const codigo = String(row.codigo ?? '').trim();
  return codigo || null;
}

function mapNeonRowToLead(row) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.phone ?? '').trim();
  const createdAt = toIso(row.created_at);
  const updatedAt = toIso(row.updated_at ?? row.created_at);
  const name = String(row.name ?? '').trim() || 'Lead';

  return {
    id: String(row.id),
    codigo: mapLeadCodigo(row),
    name,
    gender: null,
    email: email || null,
    phone: phone || null,
    company: null,
    source: String(row.origem ?? '').trim() || 'direto',
    campaign: String(row.canal ?? '').trim() || null,
    status: LEAD_STATUSES.includes(row.status) ? row.status : 'novo',
    notes: String(row.profile_notes ?? '').trim() || null,
    assignedTo: String(row.responsavel ?? '').trim() || null,
    createdBy: 'sistema',
    createdAt,
    updatedAt,
    dataHora: createdAt,
    nome: name,
    contato: email || phone || '',
    pagina: resolveEmpreendimentoPage(row),
    origem: String(row.origem ?? '').trim(),
    canal: String(row.canal ?? '').trim(),
    qualificacao: 'Indefinida',
    relacionamento: String(row.relacionamento ?? '').trim(),
    investimento: String(row.investimento ?? '').trim(),
    cidadeResidencia: String(row.cidade_residencia ?? '').trim(),
    dataNascimento: String(row.birth_date ?? '').trim(),
    perfilLead: String(row.profile_type ?? '').trim(),
    perfilOutrasRespostas: String(row.profile_notes ?? '').trim(),
    dispositivo: String(row.dispositivo ?? '').trim(),
    pagamentoPreferencia: String(row.pagamento_preferencia ?? '').trim(),
    empreendimento: String(row.empreendimento ?? '').trim(),
    responsavel: String(row.responsavel ?? '').trim(),
    parametro: String(row.parametro ?? '').trim(),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: String(row.cvcrm_sync_status ?? '').trim() || 'pending',
    cvcrm_is_sold: Boolean(row.cvcrm_is_sold),
    cvcrm_status: String(row.cvcrm_status ?? '').trim() || null,
    cvcrm_situation: String(row.cvcrm_situation ?? '').trim() || null,
    cvcrm_stage: String(row.cvcrm_stage ?? '').trim() || null,
    dataPrimeiroAtendimento: toIsoOptional(row.data_primeiro_atendimento),
    dataVisitaAgendada: toIsoOptional(row.data_visita_agendada),
    dataVisitaRealizada: toIsoOptional(row.data_visita_realizada),
    dataAnaliseCreditoInicio: toIsoOptional(row.data_analise_credito_inicio),
    dataAnaliseCreditoFim: toIsoOptional(row.data_analise_credito_fim),
    dataProposta: toIsoOptional(row.data_proposta),
    dataVenda: toIsoOptional(row.data_venda),
    dataPerdido: toIsoOptional(row.data_perdido),
    motivoPerda: String(row.motivo_perda ?? '').trim() || null,
    _table: String(row.source_table ?? '').trim(),
  };
}

async function withNeonClient(fn) {
  const neonUrl = getNeonLeadsUrl();
  if (!neonUrl) {
    console.warn('[leads] NEON_LEADS_DATABASE_URL não configurada.');
    return null;
  }

  const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

let syncInFlight = null;

/** Dispara a sincronização sem duplicar execuções concorrentes. */
function runSyncOnce() {
  if (!syncInFlight) {
    syncInFlight = syncLeadsFromSources()
      .catch((err) => console.error('[leads/sync-bg]', err))
      .finally(() => {
        syncInFlight = null;
      });
  }
  return syncInFlight;
}

export async function listLeads(_supabaseUrl, _supabaseAnonKey, _accessToken, filters = {}) {
  const fetchRows = () =>
    withNeonClient(async (client) => {
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS codigo TEXT`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_primeiro_atendimento TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_visita_agendada TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_visita_realizada TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_analise_credito_inicio TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_analise_credito_fim TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_proposta TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_venda TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_perdido TIMESTAMPTZ`);
      await client.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS motivo_perda TEXT`);
      const params = [];
      let sql = 'SELECT * FROM leads';
      if (filters.status) {
        params.push(filters.status);
        sql += ` WHERE status = $${params.length}`;
      }
      sql += ` ORDER BY
        CASE WHEN codigo ~ '^A[0-9]+$' THEN substring(codigo FROM 2)::bigint END DESC NULLS LAST,
        created_at DESC`;
      const { rows } = await client.query(sql, params);
      return rows;
    });

  try {
    let result = null;
    try {
      result = await fetchRows();
    } catch (err) {
      // 42P01 = tabela leads ainda não existe; o sync abaixo cria.
      if (err?.code !== '42P01') throw err;
    }

    if (!result || result.length === 0) {
      // Primeira carga: espera a sincronização popular a tabela unificada.
      await runSyncOnce();
      result = await fetchRows();
    } else {
      // Já há dados: responde imediatamente e sincroniza em segundo plano.
      void runSyncOnce();
    }

    if (!result) return [];
    return result
      .map(mapNeonRowToLead)
      .filter((lead) => !isIgnoredLeadSource(lead._table, lead.pagina));
  } catch (err) {
    console.error('[leads/list]', err);
    return [];
  }
}

export async function getLeadStats(supabaseUrl, supabaseAnonKey, accessToken) {
  const leads = await listLeads(supabaseUrl, supabaseAnonKey, accessToken);
  const byStatus = LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = leads.filter((lead) => lead.status === status).length;
    return acc;
  }, {});
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newToday = leads.filter((lead) => new Date(lead.createdAt) >= today).length;
  return { total: leads.length, byStatus, newToday };
}

export async function getLeadById(_supabaseUrl, _supabaseAnonKey, _accessToken, leadId) {
  try {
    const result = await withNeonClient(async (client) => {
      const { rows } = await client.query('SELECT * FROM leads WHERE id = $1 LIMIT 1', [leadId]);
      return rows[0] ?? null;
    });

    if (!result) return null;
    return mapNeonRowToLead(result);
  } catch (err) {
    console.error('[leads/get]', err);
    return null;
  }
}

export { LEAD_STATUSES };
