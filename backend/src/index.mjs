/**
 * API proxy para perfil corporativo (Neon GeTeams).
 * GET /api/corporate-profile — requer Authorization: Bearer <supabase_access_token>
 * Retorna dados do colaborador por corporate_email (email do usuário logado) ou 404.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import { getBearerJwt, resolveUserFromJwt } from './authSupabase.mjs';
import { createAuthRouter } from './routes/auth.mjs';
import { createLeadsRouter, createCvcrmWebhookRouter } from './routes/leads.mjs';
import { createCvcrmRouter } from './routes/cvcrm.mjs';
import { syncLeadsFromSources } from './services/leadSourceSync.mjs';
import './services/cvcrmIncrementalSync.mjs';
import {
  resolveNeonWorkspaceFilter,
  fetchCompanyGeTeamsWorkspaceName,
  fetchCompanyGeTeamsWorkspaceContext,
  resolveNeonWorkspaceIdByName,
} from './geTeamsWorkspace.mjs';
import { profileExistsInSupabase } from './profileExists.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Sempre lê .env do backend (evita cwd errado e sobrescreve VITE_* do shell). */
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

const app = express();
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const DEFAULT_PORT = Number(process.env.SERVER_PORT) || 3001;
const MAX_PORT_RETRIES = Number(process.env.SERVER_PORT_RETRY_COUNT) || 30;
const ACTIVE_PORT_FILE = path.join(__dirname, '..', '.server-port');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
/** Opcional: só no servidor; permite validar profiles em corporate-profile-by-email para qualquer e-mail (RLS). */
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const neonUrl = process.env.NEON_GETEAMS_DATABASE_URL;
app.locals.supabaseUrl = supabaseUrl;
app.locals.supabaseAnonKey = supabaseAnonKey;
app.locals.supabaseServiceRoleKey = supabaseServiceRoleKey;

if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    console.log('[server] Supabase (validação JWT):', hostname);
    if (hostname.includes('seu-projeto')) {
      console.warn('[server] SUPABASE_URL ainda é placeholder. Atualize backend/.env com a URL do seu projeto Supabase.');
    }
  } catch {
    console.warn('[server] SUPABASE_URL inválida em backend/.env.');
  }
} else {
  console.warn('[server] Defina SUPABASE_URL e SUPABASE_ANON_KEY no .env do backend.');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'geleads' });
});

app.use('/api/auth', createAuthRouter());
app.use('/api/webhooks', createCvcrmWebhookRouter());
app.use('/api/cvcrm', createCvcrmRouter());
app.use('/api/leads', createLeadsRouter());

syncLeadsFromSources({ force: true })
  .then((result) => {
    if (result.synced > 0) {
      console.log(`[server] Leads sincronizados na inicialização: ${result.synced}`);
    }
  })
  .catch((err) => {
    console.warn('[server] Falha ao sincronizar leads na inicialização:', err?.message ?? err);
  });

// Mapeamento: campo do CorporativoFormData -> colunas da tabela collaborators (Neon GeTeams)
// Colunas exatas: departamento <- department_cadeira_principal | setor <- setor_cadeira_principal
// Cadeira principal <- cadeira_principal_nome (nome, não ID) | Cadeiras secundárias <- cadeiras_secundarias_nomes
const COLLABORATORS_FIELD_MAP = {
  name: ['name'],
  email: ['personal_email', 'email'],
  phone: ['phone'],
  cpf: ['cpf'],
  birth_date: ['birth_date'],
  avatar_url: ['avatar_url'],
  profession: ['profession'],
  gender: ['gender'],
  hire_date: ['hire_date'],
  dismissal_date: ['dismissal_date'],
  marital_status: ['marital_status'],
  corporate_email: ['corporate_email'],
  curriculum_url: ['curriculum_url'],
  contract_url: ['contract_url'],
  departamento: ['department_cadeira_principal'],
  setor: ['setor_cadeira_principal'],
  cadeira_principal: ['cadeira_principal_nome'],
  cadeiras_secundarias: ['cadeiras_secundarias_nomes'],
  primary_chair_id: ['cadeira_principal_nome'],
};

function getRowValue(row, columnName) {
  if (row[columnName] != null && row[columnName] !== '') return row[columnName];
  const want = columnName.toLowerCase();
  if (row[want] != null && row[want] !== '') return row[want];
  const key = Object.keys(row).find((k) => k.toLowerCase() === want);
  if (key != null && row[key] != null && row[key] !== '') return row[key];
  return null;
}

function getAddressLine(row) {
  const rua = getRowValue(row, 'rua');
  const numero = getRowValue(row, 'numero');
  const complemento = getRowValue(row, 'complemento');
  const bairro = getRowValue(row, 'bairro');
  const cidade = getRowValue(row, 'cidade');
  const estado = getRowValue(row, 'estado');
  const cep = getRowValue(row, 'cep');
  const pais = getRowValue(row, 'pais');
  const str = (v) => (v != null && v !== '' ? String(v).trim() : '');
  const parts = [
    str(rua),
    str(numero),
    str(complemento),
    str(bairro),
    cidade && estado ? `${str(cidade)} - ${str(estado)}` : (str(cidade) || str(estado)),
    str(cep),
    str(pais),
  ].filter(Boolean);
  return parts.join(', ');
}

function mapRowToCorporativo(row) {
  const result = {};
  for (const [formKey, possibleColumns] of Object.entries(COLLABORATORS_FIELD_MAP)) {
    let value = '';
    for (const col of possibleColumns) {
      const v = getRowValue(row, col);
      if (v != null && v !== '') {
        value = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
        break;
      }
    }
    result[formKey] = value;
  }
  result.address = getAddressLine(row);
  return result;
}

/**
 * Dados RH só quando o e-mail bate **e** `collaborators.workspace_name` = `company_profile.ge_teams_workspace` (trim/case-insensitive).
 * Sem workspace configurado no Supabase → nenhum registo (não basta o e-mail).
 */
async function getCollaboratorByCorporateEmail(client, corporateEmail, companyWorkspaceName) {
  const normalized = (corporateEmail || '').trim().toLowerCase();
  if (!normalized) return null;
  const ws = String(companyWorkspaceName ?? '').trim();
  if (!ws) return null;

  const baseWhere = `(
     LOWER(TRIM(corporate_email)) = $1
     OR LOWER(TRIM(email)) = $1
     OR LOWER(TRIM(personal_email)) = $1
   )`;
  const sql = `SELECT * FROM collaborators WHERE ${baseWhere}
     AND LOWER(TRIM(COALESCE(workspace_name::text, ''))) = LOWER(TRIM($2))
     LIMIT 1`;
  try {
    const res = await client.query(sql, [normalized, ws]);
    return res.rows[0] || null;
  } catch (e) {
    if (e.code === '42703') {
      console.warn('[corporate-profile] Coluna workspace_name ausente em collaborators; dados RH indisponíveis.');
      return null;
    }
    throw e;
  }
}

app.get('/api/corporate-profile', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente. Use Authorization: Bearer <token>.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL ou Anon Key não configurados.');
      return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user?.email) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    const email = user.email;

    if (!neonUrl) {
      console.error('NEON_GETEAMS_DATABASE_URL não configurada.');
      return res.status(503).json({ error: 'Conexão com banco corporativo não configurada.', notFound: true });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const workspaceName = await fetchCompanyGeTeamsWorkspaceName(supabaseUrl, supabaseAnonKey, token);
      const row = await getCollaboratorByCorporateEmail(client, email, workspaceName);
      if (!row) {
        return res.status(404).json({ notFound: true, message: 'Nenhum colaborador encontrado para este e-mail.' });
      }
      const mapped = mapRowToCorporativo(row);
      return res.json(mapped);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[corporate-profile]', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Indisponível: banco corporativo.', notFound: true });
    }
    return res.status(500).json({ error: 'Erro ao buscar perfil corporativo.' });
  }
});

/**
 * Busca colaborador corporativo por e-mail informado (com JWT válido),
 * útil para complementar dados do popup de perfil (ex.: birth_date/hire_date).
 */
app.get('/api/corporate-profile-by-email', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente. Use Authorization: Bearer <token>.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    const email = String(req.query.email ?? '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Parâmetro email é obrigatório.' });
    }

    const hasProfile = await profileExistsInSupabase(
      supabaseUrl,
      supabaseAnonKey,
      token,
      supabaseServiceRoleKey,
      email,
    );
    if (!hasProfile) {
      return res.status(404).json({
        notFound: true,
        message: 'Nenhum perfil GeNovo para este e-mail.',
      });
    }

    if (!neonUrl) {
      return res.status(503).json({ error: 'Conexão com banco corporativo não configurada.', notFound: true });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const workspaceName = await fetchCompanyGeTeamsWorkspaceName(supabaseUrl, supabaseAnonKey, token);
      const row = await getCollaboratorByCorporateEmail(client, email, workspaceName);
      if (!row) {
        return res.status(404).json({ notFound: true, message: 'Nenhum colaborador encontrado para este e-mail.' });
      }
      return res.json(mapRowToCorporativo(row));
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[corporate-profile-by-email]', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({ error: 'Indisponível: banco corporativo.', notFound: true });
    }
    return res.status(500).json({ error: 'Erro ao buscar perfil corporativo por e-mail.' });
  }
});

app.get('/api/all-collaborators-sectors', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    if (!neonUrl) {
      return res.status(503).json({});
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const filter = await resolveNeonWorkspaceFilter(supabaseUrl, supabaseAnonKey, token, client);
      if (filter.mode === 'configured_not_found') {
        return res.json({});
      }
      const wsId = filter.mode === 'filter' ? filter.workspaceId : null;
      let result;
      try {
        const params = ['active'];
        let sql =
          'SELECT personal_email, corporate_email, email, setor_cadeira_principal, department_cadeira_principal FROM collaborators WHERE status = $1';
        if (wsId) {
          sql += ' AND workspace_id = $2';
          params.push(wsId);
        }
        result = await client.query(sql, params);
      } catch (e) {
        if (e.code === '42703' && wsId) {
          result = await client.query(
            'SELECT personal_email, corporate_email, email, setor_cadeira_principal, department_cadeira_principal FROM collaborators WHERE status = $1',
            ['active'],
          );
        } else {
          throw e;
        }
      }
      const map = {};
      result.rows.forEach(r => {
        const setor = r.setor_cadeira_principal ?? '';
        const departamento = r.department_cadeira_principal ?? '';
        const entry = { setor, departamento };
        if (r.corporate_email) map[r.corporate_email.toLowerCase().trim()] = entry;
        if (r.personal_email) map[r.personal_email.toLowerCase().trim()] = entry;
        if (r.email) map[r.email.toLowerCase().trim()] = entry;
      });
      return res.json(map);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[all-collaborators-sectors]', err);
    return res.status(500).json({});
  }
});

function normalizeDeptKey(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Mapa id (texto) -> nome do departamento no Neon.
 */
async function queryDepartmentNamesByIds(client, ids) {
  const uniq = [...new Set((ids || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!uniq.length) return new Map();
  const attempts = [
    'SELECT id::text AS id, name FROM departments WHERE id::text = ANY($1::text[])',
    'SELECT id::text AS id, name FROM departaments WHERE id::text = ANY($1::text[])',
  ];
  for (const sql of attempts) {
    try {
      const r = await client.query(sql, [uniq]);
      const m = new Map();
      for (const row of r.rows) {
        m.set(String(row.id), String(row.name ?? ''));
      }
      return m;
    } catch (e) {
      if (e.code !== '42P01' && e.code !== '42703') throw e;
    }
  }
  return new Map();
}

/**
 * Mapa department_id (texto) -> setores cadastrados na tabela sectors.
 */
async function queryDepartmentSectorsByIds(client, ids) {
  const uniq = [...new Set((ids || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!uniq.length) return new Map();
  try {
    const r = await client.query(
      `SELECT department_id::text AS department_id, name, icon, color
       FROM sectors
       WHERE department_id::text = ANY($1::text[])
         AND is_active = true
       ORDER BY name ASC`,
      [uniq],
    );
    // Retorna Map<deptId, Array<{ name, icon, color }>>
    const out = new Map();
    for (const id of uniq) out.set(id, []);
    for (const row of r.rows) {
      const did = String(row.department_id ?? '').trim();
      const name = String(row.name ?? '').trim();
      if (!did || !name) continue;
      if (!out.has(did)) out.set(did, []);
      const list = out.get(did);
      if (!list.find((s) => s.name === name)) {
        list.push({
          name,
          icon: row.icon ? String(row.icon).trim() : null,
          color: row.color ? String(row.color).trim() : null,
        });
      }
    }
    return out;
  } catch (e) {
    if (e.code === '42P01' || e.code === '42703') return new Map();
    throw e;
  }
}

async function loadCollaboratorAggregatesByDeptName(client, neonWorkspaceId) {
  const params = ['active'];
  let sql =
    'SELECT department_cadeira_principal, setor_cadeira_principal FROM collaborators WHERE status = $1';
  if (neonWorkspaceId) {
    sql += ' AND workspace_id = $2';
    params.push(neonWorkspaceId);
  }
  let result;
  try {
    result = await client.query(sql, params);
  } catch (e) {
    if (e.code === '42703' && neonWorkspaceId) {
      result = await client.query(
        'SELECT department_cadeira_principal, setor_cadeira_principal FROM collaborators WHERE status = $1',
        ['active'],
      );
    } else {
      throw e;
    }
  }
  const byNormName = new Map();
  for (const r of result.rows) {
    const dk = normalizeDeptKey(r.department_cadeira_principal);
    if (!dk) continue;
    let entry = byNormName.get(dk);
    if (!entry) {
      entry = { sectors: new Set(), count: 0, sectorCounts: new Map() };
      byNormName.set(dk, entry);
    }
    entry.count += 1;
    const sz = String(r.setor_cadeira_principal ?? '').trim();
    if (sz) {
      entry.sectors.add(sz);
      entry.sectorCounts.set(sz, (entry.sectorCounts.get(sz) || 0) + 1);
    }
  }
  return byNormName;
}

/**
 * GET /api/department-team-stats?ids=id1,id2
 * Retorna { [neonDepartmentId]: { sectors: string[], collaboratorCount: number } }.
 * Setores vêm de sectors.department_id; contagem de colaboradores segue do Neon collaborators.
 */
app.get('/api/department-team-stats', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const raw = req.query.ids;
    const ids = String(raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) {
      return res.json({});
    }

    if (!neonUrl) {
      return res.status(503).json({ error: 'URL do banco não configurada.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const filter = await resolveNeonWorkspaceFilter(supabaseUrl, supabaseAnonKey, token, client);
      const idToName = await queryDepartmentNamesByIds(client, ids);
      const sectorsByDeptId = await queryDepartmentSectorsByIds(client, ids);
      let byNormName;
      if (filter.mode === 'configured_not_found') {
        byNormName = new Map();
      } else {
        const wsId = filter.mode === 'filter' ? filter.workspaceId : null;
        byNormName = await loadCollaboratorAggregatesByDeptName(client, wsId);
      }
      const out = {};
      for (const id of ids) {
        const name = idToName.get(id) ?? '';
        const key = normalizeDeptKey(name);
        const agg = key ? byNormName.get(key) : undefined;
        // sectorsByDeptId agora retorna Array<{ name, icon, color }>
        const sectorObjs = sectorsByDeptId.get(id) ?? [];
        const sectorList = sectorObjs.map((s) => s.name);
        const sectorCounts = {};
        const sectorIcons = {};
        const sectorColors = {};
        for (const s of sectorObjs) {
          sectorCounts[s.name] = agg?.sectorCounts?.get(s.name) || 0;
          if (s.icon) sectorIcons[s.name] = s.icon;
          if (s.color) sectorColors[s.name] = s.color;
        }
        out[id] = {
          sectors: sectorList,
          collaboratorCount: agg ? agg.count : 0,
          sectorCounts,
          sectorIcons,
          sectorColors,
        };
      }
      return res.json(out);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[department-team-stats]', err);
    return res.status(500).json({ error: 'Erro ao agregar dados do departamento.' });
  }
});

/**
 * Colaboradores ativos do Neon cujo department_cadeira_principal corresponde aos departamentos (ids).
 * GET /api/teams-neon-collaborators?ids=id1,id2
 */
app.get('/api/teams-neon-collaborators', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    const raw = req.query.ids;
    const ids = String(raw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) {
      return res.json({ collaborators: [] });
    }

    if (!neonUrl) {
      return res.status(503).json({ error: 'URL do banco não configurada.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const filter = await resolveNeonWorkspaceFilter(supabaseUrl, supabaseAnonKey, token, client);
      if (filter.mode === 'configured_not_found') {
        return res.json({ collaborators: [] });
      }
      const wsId = filter.mode === 'filter' ? filter.workspaceId : null;

      const idToName = await queryDepartmentNamesByIds(client, ids);
      console.log('[teams-neon-collaborators] idToName:', [...idToName.entries()]);

      const nameToNeonId = new Map();
      for (const [nid, name] of idToName) {
        nameToNeonId.set(normalizeDeptKey(name), nid);
      }

      const want = new Set(ids);

      const baseParams = ['active'];
      let workspaceSql = '';
      if (wsId) {
        workspaceSql = ' AND workspace_id = $2';
        baseParams.push(wsId);
      }

      const qWithDept = `SELECT name, corporate_email, personal_email, email, department_cadeira_principal, setor_cadeira_principal, birth_date, hire_date, department_id::text AS dept_id
           FROM collaborators WHERE status = $1${workspaceSql}`;
      const qNoDept = `SELECT name, corporate_email, personal_email, email, department_cadeira_principal, setor_cadeira_principal, birth_date, hire_date
             FROM collaborators WHERE status = $1${workspaceSql}`;

      /** department_id e/ou workspace_id podem não existir no Neon legado — tenta combinações. */
      const attempts = [];
      if (wsId) {
        attempts.push(
          { sql: qWithDept, params: baseParams, hasDept: true },
          { sql: qWithDept.replace(workspaceSql, ''), params: ['active'], hasDept: true },
          { sql: qNoDept, params: baseParams, hasDept: false },
          { sql: qNoDept.replace(workspaceSql, ''), params: ['active'], hasDept: false },
        );
      } else {
        attempts.push(
          { sql: qWithDept, params: ['active'], hasDept: true },
          { sql: qNoDept, params: ['active'], hasDept: false },
        );
      }

      let result = null;
      let hasDeptIdCol = false;
      let lastErr = null;
      for (const att of attempts) {
        try {
          result = await client.query(att.sql, att.params);
          hasDeptIdCol = att.hasDept;
          lastErr = null;
          break;
        } catch (e) {
          if (e.code === '42703') {
            lastErr = e;
            continue;
          }
          throw e;
        }
      }
      if (!result) {
        throw lastErr || new Error('collaborators query failed');
      }

      console.log('[teams-neon-collaborators] total collaborators from Neon:', result.rows.length, '| hasDeptIdCol:', hasDeptIdCol);

      const list = [];
      for (const r of result.rows) {
        let nid = null;

        // Tenta match direto por department_id (mais confiável)
        if (hasDeptIdCol && r.dept_id && want.has(r.dept_id)) {
          nid = r.dept_id;
        }

        // Fallback: match por nome normalizado
        if (!nid) {
          nid = nameToNeonId.get(normalizeDeptKey(r.department_cadeira_principal)) ?? null;
        }

        if (!nid || !want.has(nid)) continue;

        const emailRaw =
          r.corporate_email?.trim() || r.email?.trim() || r.personal_email?.trim() || '';
        if (!emailRaw) continue;
        list.push({
          id: emailRaw.toLowerCase(),
          name: String(r.name ?? '').trim() || '—',
          email: emailRaw,
          departmentName: String(r.department_cadeira_principal ?? '').trim(),
          sectorName: String(r.setor_cadeira_principal ?? '').trim(),
          birthDate: r.birth_date ? String(r.birth_date).slice(0, 10) : '',
          hireDate: r.hire_date ? String(r.hire_date).slice(0, 10) : '',
          neonDepartmentId: nid,
        });
      }
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      console.log('[teams-neon-collaborators] matched collaborators:', list.length);
      return res.json({ collaborators: list });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[teams-neon-collaborators]', err);
    return res.status(500).json({ error: 'Erro ao listar colaboradores.' });
  }
});

/**
 * Departamentos no Neon filtrados por `departments.workspace_id` (= id em public.workspaces).
 * Schema GeTeams atual: não há coluna `workspace` em departments; o vínculo é só por UUID.
 */
async function queryGeTeamsDepartmentsByWorkspaceId(client, neonWorkspaceUuid) {
  const id = String(neonWorkspaceUuid ?? '').trim();
  if (!id) return [];

  const pred = `TRIM(workspace_id::text) = TRIM($1)`;
  const params = [id];
  const selectBase = 'id, name, icon, description, color';
  const selectWithWsId = `${selectBase}, workspace_id::text AS workspace_id`;
  const activeVariants = [
    'is_active = true AND deleted_at IS NULL',
    'is_active = true',
    'TRUE',
  ];
  const tables = ['departments', 'departaments'];

  for (const sel of [selectWithWsId, selectBase]) {
    for (const tbl of tables) {
      for (const act of activeVariants) {
        const sql = `SELECT ${sel} FROM ${tbl} WHERE ${act} AND ${pred} ORDER BY name ASC`;
        try {
          const r = await client.query(sql, params);
          return r.rows;
        } catch (e) {
          const retryable = e.code === '42703' || e.code === '42P01' || e.code === '42601';
          if (retryable) continue;
          throw e;
        }
      }
    }
  }
  console.warn('[departments] Não foi possível listar por workspace_id (tabela/colunas?).');
  return [];
}

function isDevServer() {
  return process.env.NODE_ENV !== 'production';
}

app.get('/api/departments', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente. Use Authorization: Bearer <token>.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }

    if (!neonUrl) {
      return res.status(503).json({ error: 'URL do banco não configurada.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const ctx = await fetchCompanyGeTeamsWorkspaceContext(supabaseUrl, supabaseAnonKey, token);
      const workspaceName = ctx.name?.trim() ?? '';
      let neonId = ctx.workspaceId?.trim() ?? '';
      if (!workspaceName && !neonId) {
        return res.json([]);
      }
      if (!neonId && workspaceName) {
        neonId = (await resolveNeonWorkspaceIdByName(client, workspaceName)) ?? '';
      }
      if (!neonId) {
        return res.json([]);
      }
      const rows = await queryGeTeamsDepartmentsByWorkspaceId(client, neonId);
      return res.json(rows);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[departments]', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Não foi possível conectar ao banco GeTeams (Neon). Verifique NEON_GETEAMS_DATABASE_URL.',
        ...(isDevServer() ? { hint: err.message, code: err.code } : {}),
      });
    }
    return res.status(500).json({
      error: 'Erro ao buscar departamentos.',
      ...(isDevServer() ? { hint: err.message, pgCode: err.code } : {}),
    });
  }
});

app.get('/api/workspace-resolve', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente. Use Authorization: Bearer <token>.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    if (!neonUrl) {
      return res.status(503).json({ error: 'URL do banco Neon não configurada.' });
    }
    const raw = req.query.q ?? req.query.name;
    const name = String(raw ?? '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Parâmetro q ou name (nome do workspace) é obrigatório.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const id = await resolveNeonWorkspaceIdByName(client, name);
      return res.json({ id: id ?? null });
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[workspace-resolve]', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Não foi possível conectar ao banco GeTeams (Neon).',
        ...(isDevServer() ? { hint: err.message, code: err.code } : {}),
      });
    }
    return res.status(500).json({
      error: 'Erro ao resolver workspace.',
      ...(isDevServer() ? { hint: err.message, pgCode: err.code } : {}),
    });
  }
});

app.get('/api/workspaces-active', async (req, res) => {
  try {
    const token = getBearerJwt(req);
    if (!token) {
      return res.status(401).json({ error: 'Token ausente. Use Authorization: Bearer <token>.' });
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado.' });
    }
    const { user, error: userError } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    if (!neonUrl) {
      return res.status(503).json({ error: 'URL do banco Neon não configurada.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    await client.connect();
    try {
      const attempts = [
        `SELECT id::text AS id, name FROM public.workspaces
         WHERE status = 'active' AND deleted_at IS NULL ORDER BY name ASC`,
        `SELECT id::text AS id, name FROM public.workspaces
         WHERE status = 'active' ORDER BY name ASC`,
        `SELECT id::text AS id, name FROM public.workspaces ORDER BY name ASC`,
      ];
      let rows = [];
      for (const sql of attempts) {
        try {
          const result = await client.query(sql);
          rows = result.rows;
          break;
        } catch (e) {
          const retryable = e.code === '42703' || e.code === '42P01' || e.code === '42601';
          if (!retryable) throw e;
        }
      }
      const list = rows
        .map((r) => ({ id: r.id != null ? String(r.id) : '', name: r.name != null ? String(r.name) : '' }))
        .filter((r) => r.name);
      return res.json(list);
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('[workspaces-active]', err);
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Não foi possível conectar ao banco GeTeams (Neon).',
        ...(isDevServer() ? { hint: err.message, code: err.code } : {}),
      });
    }
    return res.status(500).json({
      error: 'Erro ao buscar workspaces.',
      ...(isDevServer() ? { hint: err.message, pgCode: err.code } : {}),
    });
  }
});

app.use(express.static(distPath));

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Rota de API não encontrada.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

function clearActivePortFile() {
  try {
    if (fs.existsSync(ACTIVE_PORT_FILE)) fs.unlinkSync(ACTIVE_PORT_FILE);
  } catch (err) {
    console.warn('[server] Não foi possível limpar .server-port:', err?.message ?? err);
  }
}

function persistActivePort(port) {
  try {
    fs.writeFileSync(ACTIVE_PORT_FILE, String(port), 'utf8');
  } catch (err) {
    console.warn('[server] Não foi possível salvar .server-port:', err?.message ?? err);
  }
}

function startServerWithFallback(port, retriesLeft) {
  const server = app.listen(port, () => {
    persistActivePort(port);
    console.log(`[server] API rodando em http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE' && retriesLeft > 0) {
      const nextPort = port + 1;
      console.warn(`[server] Porta ${port} ocupada. Tentando ${nextPort}...`);
      return startServerWithFallback(nextPort, retriesLeft - 1);
    }
    console.error('[server] Falha ao iniciar API:', err);
    process.exit(1);
  });
}

clearActivePortFile();
startServerWithFallback(DEFAULT_PORT, MAX_PORT_RETRIES);
