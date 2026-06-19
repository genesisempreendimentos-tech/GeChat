import pg from 'pg';
import { resolveEmpreendimentoPage } from '../leadEmpreendimento.mjs';
import { isIgnoredLeadSource } from '../ignoredLeadSources.mjs';
import { syncLeadsFromSources } from './leadSourceSync.mjs';
import { materializeEmpreendimentoInteresse } from '../lib/empreendimentoInteresseNull.mjs';

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

function mapLeadCodigo(row) {
  const codigo = String(row.codigo ?? '').trim();
  return codigo || null;
}

function formatBirthDate(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) {
    const day = String(value.getUTCDate()).padStart(2, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const year = value.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  return String(value).trim();
}

function formatParameter(value) {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? '').trim()).filter(Boolean).join(', ');
  }
  return String(value ?? '').trim();
}

function mapCanalOrigem(row) {
  const canal = String(row.canal ?? '').trim();
  if (!canal) return 'Direto';
  if (canal.toLowerCase() === 'site') return 'Direto';
  return canal;
}

function deriveLeadStatus(row) {
  if (row.cvcrm_is_sold) return 'ganho';
  if (row.profile_completed) return 'qualificado';
  if (row.cvcrm_status) {
    const normalized = String(row.cvcrm_status).toLowerCase();
    if (normalized.includes('negoci')) return 'negociacao';
    if (normalized.includes('contato')) return 'contato';
    if (normalized.includes('perd')) return 'perdido';
  }
  return 'novo';
}

function mapNeonRowToLead(row) {
  const email = String(row.email ?? '').trim();
  const phone = String(row.phone ?? '').trim();
  const createdAt = toIso(row.created_at);
  const updatedAt = toIso(row.updated_at ?? row.created_at);
  const name = String(row.name ?? '').trim() || 'Lead';
  const empreendimento = materializeEmpreendimentoInteresse(row.empreendimento_interesse);
  const childrenStatus = String(row.children_status ?? '').trim();
  const parameter = formatParameter(row.parameter);

  return {
    id: String(row.id),
    codigo: mapLeadCodigo(row),
    name,
    gender: String(row.gender ?? '').trim() || null,
    email: email || null,
    phone: phone || null,
    company: null,
    source: mapCanalOrigem(row).toLowerCase(),
    campaign: String(row.canal ?? '').trim() || null,
    status: LEAD_STATUSES.includes(deriveLeadStatus(row)) ? deriveLeadStatus(row) : 'novo',
    notes: childrenStatus ? `Filhos: ${childrenStatus}` : null,
    assignedTo: null,
    createdBy: 'sistema',
    createdAt,
    updatedAt,
    dataHora: createdAt,
    nome: name,
    contato: email || phone || '',
    pagina: resolveEmpreendimentoPage(row),
    origem: mapCanalOrigem(row),
    canal: String(row.canal ?? '').trim(),
    qualificacao: row.profile_completed ? 'Qualificado' : 'Indefinida',
    relacionamento: String(row.relationship_status ?? '').trim(),
    investimento: String(row.monthly_investment ?? '').trim(),
    cidadeResidencia: String(row.current_city ?? '').trim(),
    dataNascimento: formatBirthDate(row.birth_date),
    perfilLead: String(row.profile_type ?? '').trim(),
    perfilOutrasRespostas: childrenStatus,
    dispositivo: '',
    pagamentoPreferencia: '',
    empreendimento,
    responsavel: '',
    parametro: parameter,
    profile_completed: Boolean(row.profile_completed),
    whatsapp_clicked: Boolean(row.whatsapp_clicked),
    cvcrm_lead_id: String(row.cvcrm_lead_id ?? '').trim() || null,
    cvcrm_sync_status: String(row.cvcrm_sync_status ?? '').trim() || 'pending',
    cvcrm_is_sold: Boolean(row.cvcrm_is_sold),
    cvcrm_status: String(row.cvcrm_status ?? '').trim() || null,
    cvcrm_situation: String(row.cvcrm_situation ?? '').trim() || null,
    cvcrm_stage: String(row.cvcrm_stage ?? '').trim() || null,
    dataPrimeiroAtendimento: null,
    dataVisitaAgendada: null,
    dataVisitaRealizada: null,
    dataAnaliseCreditoInicio: null,
    dataAnaliseCreditoFim: null,
    dataProposta: null,
    dataVenda: row.cvcrm_sale_date ? toIso(row.cvcrm_sale_date) : null,
    dataPerdido: null,
    motivoPerda: null,
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
      const { rows } = await client.query(
        `SELECT * FROM all_leads ORDER BY
          CASE WHEN codigo ~ '^A[0-9]+$' THEN substring(codigo FROM 2)::bigint END DESC NULLS LAST,
          created_at DESC`,
      );
      return rows;
    });

  try {
    let result = null;
    try {
      result = await fetchRows();
    } catch (err) {
      if (err?.code !== '42P01') throw err;
    }

    if (!result || result.length === 0) {
      await runSyncOnce();
      result = await fetchRows();
    } else {
      void runSyncOnce();
    }

    if (!result) return [];
    return result
      .map(mapNeonRowToLead)
      .filter((lead) => {
        if (filters.status && lead.status !== filters.status) return false;
        return !isIgnoredLeadSource(lead._table, lead.pagina);
      });
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
      const { rows } = await client.query('SELECT * FROM all_leads WHERE id = $1 LIMIT 1', [leadId]);
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
