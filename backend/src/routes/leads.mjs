import express from 'express';
import { getBearerJwt, resolveUserFromJwt } from '../middleware/authSupabase.mjs';
import { listLeads, getLeadStats, getLeadById, LEAD_STATUSES } from '../services/leadsService.mjs';

const ACCESS_COOKIE = 'geleads_sb_access';
const REFRESH_COOKIE = 'geleads_sb_refresh';

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const found = raw
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(name.length + 1));
}

async function resolveAccessToken(req, res) {
  const bearer = getBearerJwt(req);
  if (bearer) return bearer;

  const { supabaseUrl, supabaseAnonKey } = req.app.locals;
  const accessToken = readCookie(req, ACCESS_COOKIE);
  if (accessToken) return accessToken;

  const refreshToken = readCookie(req, REFRESH_COOKIE);
  if (!refreshToken || !supabaseUrl || !supabaseAnonKey) return null;

  const { createSupabaseAnonClient } = await import('../services/supabaseServer.mjs');
  const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey);
  const refreshed = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshed.error || !refreshed.data?.session?.access_token) return null;
  return refreshed.data.session.access_token;
}

async function requireAuth(req, res, next) {
  try {
    const accessToken = await resolveAccessToken(req, res);
    if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });

    const { user } = await resolveUserFromJwt(req.app.locals.supabaseUrl, req.app.locals.supabaseAnonKey, accessToken);
    if (!user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    req.accessToken = accessToken;
    req.authUserId = user.id;
    next();
  } catch (err) {
    console.error('[leads/auth]', err);
    return res.status(500).json({ error: 'Erro de autenticação.' });
  }
}

export function createLeadsRouter() {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/statuses', (_req, res) => {
    res.json({ statuses: LEAD_STATUSES });
  });

  router.get('/stats', async (req, res) => {
    try {
      const stats = await getLeadStats();
      res.json(stats);
    } catch (err) {
      console.error('[leads/stats]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao carregar estatísticas.' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      const leads = await listLeads(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseAnonKey,
        req.accessToken,
        { status },
      );
      res.json({ leads });
    } catch (err) {
      console.error('[leads/list]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao listar leads.' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const lead = await getLeadById(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseAnonKey,
        req.accessToken,
        req.params.id,
      );
      if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });
      res.json({ lead });
    } catch (err) {
      console.error('[leads/get]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao buscar lead.' });
    }
  });

  return router;
}
