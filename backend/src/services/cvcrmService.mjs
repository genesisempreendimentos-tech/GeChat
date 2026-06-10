/**
 * Integração CVCRM — espelha codigo-integracao-modelo.gs (postToCvcrm_ / buildCvcrmCreatePayload_).
 */

const SOLAR_BOSQUE_PAYLOAD_CONFIG = {
  campoNome: ['nome', 'name'],
  campoTelefone: ['whatsapp', 'phone', 'telefone'],
  sourceTable: 'leads_solar_bosque',
  defaultEmpreendimento: 'Solar do Bosque',
  idEmpreendimento: 'SOLAR_DO_BOSQUE',
};

const OASIS_II_PAYLOAD_CONFIG = {
  campoNome: 'name',
  campoTelefone: 'phone',
  sourceTable: 'leads_oasis_ii',
  defaultEmpreendimento: 'Oásis Residencial II',
  idEmpreendimento: 'OASIS_RESIDENCIAL_II',
  extraObservacaoFields: [{ key: 'children_status', label: 'Filhos' }],
};

/** Nomes normalizados → chave .env (null = sem empreendimento). */
const NAME_TO_ENV = {
  'nature residencial': 'NATURE_PETROPOLIS_RESIDENCES',
  'residencial nature': 'NATURE_PETROPOLIS_RESIDENCES',
  'flow residencial': 'FLOW',
  flow: 'FLOW',
  vibrant: 'VIBRANT_AGRIOES',
  'vibránt': 'VIBRANT_AGRIOES',
  arvoredo: 'RESIDENCIAL_ARVOREDO',
  'solar imbui': 'CONDOMINIO_SOLAR_IMBUI',
  'solar imbuí': 'CONDOMINIO_SOLAR_IMBUI',
  'estacao nogueira i': 'ESTACAO_NOGUEIRA_I',
  'estacao nogueira ii': 'ESTACAO_NOGUEIRA_II',
  'estacao nogueira iii': 'ESTACAO_NOGUEIRA_III',
  'estacao nogueira': null,
  'vita residencial': 'VITA_RESIDENCIAL',
  'oasis residencial': 'OASIS_RESIDENCIAL',
  'oásis residencial': 'OASIS_RESIDENCIAL',
  kastell: 'KASTELL_RESIDENCIAL',
  flores: 'SOLAR_DAS_FLORES',
  'solar das flores': 'SOLAR_DAS_FLORES',
  'nao sei / quero ajuda para escolher': null,
  'não sei / quero ajuda para escolher': null,
  'nao sei': null,
  'não sei': null,
};

const NAME_BLOCKLIST = new Set([
  'nao sei / quero ajuda para escolher',
  'não sei / quero ajuda para escolher',
  'nao sei',
  'não sei',
  'quero ajuda',
  'selecione um empreendimento',
  'selecione',
  'estacao nogueira',
  'estação nogueira',
]);

const STANDARD_NAME_PHONE_CONFIG = {
  campoNome: 'name',
  campoTelefone: 'phone',
};

/** Configuração CVCRM por tabela (exceto solar_bosque e oasis_ii — legado). */
export const CVCRM_TABLE_CONFIGS = {
  leads_kastell: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_kastell',
    defaultEmpreendimento: 'Kastell Residencial',
    idEmpreendimento: 'KASTELL_RESIDENCIAL',
  },
  leads_nature: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_nature',
    defaultEmpreendimento: 'Nature Residencial',
    idEmpreendimento: 'NATURE_PETROPOLIS_RESIDENCES',
  },
  leads_oasis_i: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_oasis_i',
    defaultEmpreendimento: 'Oásis Residencial',
    idEmpreendimento: 'OASIS_RESIDENCIAL',
  },
  leads_solar_bellavista: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_solar_bellavista',
    defaultEmpreendimento: 'Solar Bellavista',
    idEmpreendimento: 'SOLAR_BELLAVISTA',
  },
  leads_solar_flores: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_solar_flores',
    defaultEmpreendimento: 'Solar das Flores',
    idEmpreendimento: 'SOLAR_DAS_FLORES',
  },
  leads_vita: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_vita',
    defaultEmpreendimento: 'Vita Residencial',
    idEmpreendimento: 'VITA_RESIDENCIAL',
  },
  leads_flow: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_flow',
    defaultEmpreendimento: 'Flow',
    idEmpreendimento: 'FLOW',
  },
  leads_aniversario_208_anos: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_aniversario_208_anos',
    defaultEmpreendimento: 'Solar das Flores',
    idEmpreendimento: 'SOLAR_DAS_FLORES',
  },
  leads_gesite: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_gesite',
    defaultEmpreendimento: 'GêSite',
    idEmpreendimento: null,
  },
  leads_blackgenesis: {
    ...STANDARD_NAME_PHONE_CONFIG,
    sourceTable: 'leads_blackgenesis',
    defaultEmpreendimento: 'Black Gênesis',
    idEmpreendimento: 'dynamic',
    campoEmpreendimentoDinamico: ['empreendimento', 'selected_empreendimento', 'projeto', 'project'],
    isBlack: true,
  },
  leads_old: {
    campoNome: 'name',
    campoTelefone: 'phone',
    sourceTable: 'leads_old',
    defaultEmpreendimento: null,
    idEmpreendimento: 'dynamic',
    campoEmpreendimentoDinamico: ['interesse', 'empreendimento'],
    birthDateField: 'nascimento',
    birthDateUnix: true,
    extraObservacaoFields: [
      { key: 'interesse', label: 'Interesse' },
      { key: 'data_entrada', label: 'Data entrada' },
    ],
    skipProfileType: true,
  },
};

/** Ordem de polling CVCRM (solar_bosque e oasis_ii tratados à parte). */
export const CVCRM_POLL_TABLES = [
  'leads_solar_bosque',
  'leads_oasis_ii',
  ...Object.keys(CVCRM_TABLE_CONFIGS),
];

function trimEnv(key) {
  return String(process.env[key] ?? '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function getCvcrmConfig() {
  return {
    base: trimEnv('CVCRM_BASE') || 'https://genesis.cvcrm.com.br/api/v1/cvbot/lead',
    email: trimEnv('CVCRM_EMAIL'),
    token: trimEnv('CVCRM_TOKEN'),
  };
}

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = toSafeString(value);
    if (text !== '') return value;
  }
  return '';
}

function normalizePhone(value) {
  const raw = toSafeString(value);
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/[^\d]/g, '');
  return hasPlus ? `+${digits}` : digits;
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toLowerCase();
}

function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseUnixBirthDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return null;
  const ms = num < 1_000_000_000_000 ? num * 1000 : num;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoBr(value) {
  const date = parseDate(value);
  if (!date) return toSafeString(value);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function formatBirthDateBr(value, config = {}) {
  const date = config.birthDateUnix ? parseUnixBirthDate(value) : parseDate(value);
  if (!date) return toSafeString(value);
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function parseEnvId(key) {
  if (!key) return null;
  const value = Number(trimEnv(key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveFieldNames(field) {
  if (!field) return [];
  return Array.isArray(field) ? field : [field];
}

function resolveIdFromEnvKey(envKey) {
  if (!envKey) return null;
  return parseEnvId(envKey);
}

function resolveDynamicIdEmpreendimento(lead, config) {
  const fields = resolveFieldNames(config.campoEmpreendimentoDinamico);
  for (const field of fields) {
    const raw = firstNonEmpty(lead?.[field]);
    if (!raw) continue;

    const key = normalizeName(raw);
    if (NAME_BLOCKLIST.has(key)) return null;

    const envKey = NAME_TO_ENV[key];
    if (envKey === null) return null;
    if (envKey) return resolveIdFromEnvKey(envKey);

    const numeric = Number(String(raw).replace(/[^\d]/g, ''));
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  return null;
}

function resolveIdEmpreendimento(lead, config = {}) {
  if (config.idEmpreendimento === null) return null;

  if (config.idEmpreendimento === 'dynamic') {
    return resolveDynamicIdEmpreendimento(lead, config);
  }

  if (typeof config.idEmpreendimento === 'number' && config.idEmpreendimento > 0) {
    return config.idEmpreendimento;
  }

  if (typeof config.idEmpreendimento === 'string') {
    const fromEnv = resolveIdFromEnvKey(config.idEmpreendimento);
    if (fromEnv) return fromEnv;
  }

  const fromLead = Number(toSafeString(lead?.idempreendimento).replace(/[^\d]/g, ''));
  if (Number.isFinite(fromLead) && fromLead > 0) return fromLead;

  return null;
}

function getCvcrmDefaultStatusId() {
  const value = Number(trimEnv('CVCRM_DEFAULT_STATUS_ID'));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function buildCvcrmPayload(lead, config = {}) {
  const nomeFields = resolveFieldNames(config.campoNome ?? ['nome', 'name']);
  const phoneFields = resolveFieldNames(config.campoTelefone ?? ['whatsapp', 'phone', 'telefone']);

  const nome = toSafeString(firstNonEmpty(...nomeFields.map((field) => lead?.[field])));
  const email = toSafeString(firstNonEmpty(lead?.email));
  const telefone = normalizePhone(firstNonEmpty(...phoneFields.map((field) => lead?.[field])));
  const idempreendimento = resolveIdEmpreendimento(lead, config);

  const origem = toSafeString(firstNonEmpty(lead?.source_table, lead?._table, config.sourceTable));
  const isBlack = config.isBlack || String(origem).toLowerCase().includes('black');

  const headerLines = [];
  headerLines.push(isBlack ? '=== LEAD BLACK GÊNESIS ===' : '=== LEAD ===');
  if (origem) headerLines.push(`[Origem: ${origem}]`);

  const bodyLines = [];
  const canal = toSafeString(lead?.canal);
  const interesse = toSafeString(lead?.interesse);
  const empreendimento = toSafeString(firstNonEmpty(lead?.empreendimento, config.defaultEmpreendimento));
  const relationshipStatus = toSafeString(lead?.relationship_status);
  const monthlyInvestment = toSafeString(lead?.monthly_investment);
  const currentCity = toSafeString(lead?.current_city);
  const profileType = config.skipProfileType ? '' : toSafeString(lead?.profile_type);
  const birthDateField = config.birthDateField ?? 'birth_date';
  const birthDate = firstNonEmpty(lead?.[birthDateField], lead?.birth_date);
  const createdAt = firstNonEmpty(lead?.created_at);

  const extraFieldKeys = new Set((config.extraObservacaoFields ?? []).map((field) => field.key));

  if (canal) bodyLines.push(`Canal: ${canal}`);
  if (interesse && !extraFieldKeys.has('interesse')) bodyLines.push(`Interesse: ${interesse}`);
  if (empreendimento) bodyLines.push(`Empreendimento: ${empreendimento}`);
  if (monthlyInvestment) bodyLines.push(`Renda familiar: ${monthlyInvestment}`);
  if (relationshipStatus) bodyLines.push(`Estado civil: ${relationshipStatus}`);
  if (profileType) bodyLines.push(`Perfil: ${profileType}`);
  if (currentCity) bodyLines.push(`Cidade: ${currentCity}`);
  if (birthDate) bodyLines.push(`Nascimento: ${formatBirthDateBr(birthDate, config)}`);
  if (createdAt) bodyLines.push(`Data do lead (BR): ${formatIsoBr(createdAt)}`);

  for (const field of config.extraObservacaoFields ?? []) {
    const value = toSafeString(lead?.[field.key]);
    if (value) bodyLines.push(`${field.label}: ${value}`);
  }

  const payload = {
    nome,
    email,
    telefone,
    status: 'Aguardando atendimento inicial',
  };

  const idStatus = getCvcrmDefaultStatusId();
  if (idStatus) payload.idstatus = idStatus;
  if (idempreendimento) payload.idempreendimento = idempreendimento;
  if (isBlack) payload.tag = 'BLACK GÊNESIS';

  const observacao = headerLines.concat(bodyLines).join('\n');
  if (observacao) payload.observacao = observacao;

  return { payload, idempreendimento };
}

function bodyToLeadId(body) {
  if (!body || typeof body !== 'object') return null;
  if (body.idlead) return String(body.idlead);
  if (body.id) return String(body.id);
  if (body.lead?.id) return String(body.lead.id);
  return null;
}

async function postLeadToCvcrm(lead, payloadConfig, { requireIdEmpreendimento = true } = {}) {
  const { base, email, token } = getCvcrmConfig();

  if (!email || !token) {
    return { ok: false, error: 'CVCRM_EMAIL e CVCRM_TOKEN devem estar configurados no .env' };
  }

  const { payload, idempreendimento } = buildCvcrmPayload(lead, payloadConfig);

  if (!toSafeString(payload.nome)) {
    return { ok: false, error: 'Lead sem nome' };
  }

  if (!toSafeString(payload.email) && !toSafeString(payload.telefone)) {
    return { ok: false, error: 'Lead sem email e sem telefone' };
  }

  if (requireIdEmpreendimento && !idempreendimento) {
    return {
      ok: false,
      error: 'idempreendimento não configurado. Defina o ID do empreendimento no .env.',
    };
  }

  let response;
  try {
    const res = await fetch(base, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        email,
        token,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text || null;
    }

    const ok = res.status >= 200 && res.status < 300;
    response = { status: res.status, body, text };

    if (!ok) {
      return {
        ok: false,
        error: `HTTP ${res.status} - ${text || JSON.stringify(body)}`,
        payload,
        response,
      };
    }

    return {
      ok: true,
      cvcrm_lead_id: bodyToLeadId(body),
      payload,
      response,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      payload,
      response,
    };
  }
}

/** Envia lead com config de tabela genérica (permite idempreendimento null). */
export async function sendLeadGeneric(lead, tableConfig) {
  return postLeadToCvcrm(lead, tableConfig, { requireIdEmpreendimento: false });
}

/** Envia um lead (linha de leads_solar_bosque) para o CVCRM. */
export async function sendLeadToCvcrm(lead) {
  return postLeadToCvcrm(lead, SOLAR_BOSQUE_PAYLOAD_CONFIG);
}

/** Envia um lead (linha de leads_oasis_ii) para o CVCRM. */
export async function sendLeadToCvcrm_oasis_ii(lead) {
  return postLeadToCvcrm(lead, OASIS_II_PAYLOAD_CONFIG);
}
