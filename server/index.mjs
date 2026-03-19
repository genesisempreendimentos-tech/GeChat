/**
 * API proxy para perfil corporativo (Neon GeTeams).
 * GET /api/corporate-profile — requer Authorization: Bearer <supabase_access_token>
 * Retorna dados do colaborador por corporate_email (email do usuário logado) ou 404.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import pg from 'pg';
import { getBearerJwt, resolveUserFromJwt } from './authSupabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/** Sempre lê .env na raiz do projeto (evita cwd errado ao rodar o Node). */
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const PORT = process.env.SERVER_PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const neonUrl = process.env.NEON_GETEAMS_DATABASE_URL;

if (supabaseUrl) {
  try {
    console.log('[server] Supabase (validação JWT):', new URL(supabaseUrl).hostname);
  } catch {
    /* ignore */
  }
} else {
  console.warn('[server] Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env da raiz.');
}

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

async function getCollaboratorByCorporateEmail(client, corporateEmail) {
  const normalized = (corporateEmail || '').trim().toLowerCase();
  if (!normalized) return null;
  const res = await client.query(
    'SELECT * FROM collaborators WHERE LOWER(TRIM(corporate_email)) = $1 LIMIT 1',
    [normalized]
  );
  return res.rows[0] || null;
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
      const row = await getCollaboratorByCorporateEmail(client, email);
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
      const result = await client.query('SELECT personal_email, corporate_email, email, setor_cadeira_principal FROM collaborators WHERE status = $1', ['active']);
      const map = {};
      result.rows.forEach(r => {
        const sector = r.setor_cadeira_principal;
        if (sector) {
          if (r.corporate_email) map[r.corporate_email.toLowerCase()] = sector;
          if (r.personal_email) map[r.personal_email.toLowerCase()] = sector;
          if (r.email) map[r.email.toLowerCase()] = sector;
        }
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

/**
 * Departamentos no Neon GeTeams: alguns ambientes não têm is_active/deleted_at ou usam nome de tabela diferente.
 */
async function queryGeTeamsDepartments(client) {
  const strict = `SELECT id, name, icon, description, color
    FROM departments
    WHERE is_active = true AND deleted_at IS NULL
    ORDER BY name ASC`;
  try {
    const r = await client.query(strict);
    return r.rows;
  } catch (e) {
    const retryable = e.code === '42703' || e.code === '42P01';
    if (!retryable) throw e;
    try {
      const r2 = await client.query(
        `SELECT id, name, icon, description, color FROM departments ORDER BY name ASC`,
      );
      return r2.rows;
    } catch (e2) {
      if (e2.code !== '42P01') throw e2;
      const r3 = await client.query(
        `SELECT id, name, icon, description, color FROM departaments ORDER BY name ASC`,
      );
      return r3.rows;
    }
  }
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
      const rows = await queryGeTeamsDepartments(client);
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

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] API rodando em http://localhost:${PORT}`);
});
