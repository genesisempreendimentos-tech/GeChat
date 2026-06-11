import express from 'express';
import { getBearerJwt, resolveUserFromJwt } from '../middleware/authSupabase.mjs';
import {
  getCvcrmPendingCount,
  syncPendingLeads,
} from '../services/cvcrmBatchSync.mjs';

const ACCESS_COOKIE = 'geleads_sb_access';

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

async function resolveAccessToken(req) {
  const bearer = getBearerJwt(req);
  if (bearer) return bearer;

  const accessToken = readCookie(req, ACCESS_COOKIE);
  return accessToken || null;
}

async function requireAuth(req, res, next) {
  try {
    const accessToken = await resolveAccessToken(req);
    if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });

    const { user } = await resolveUserFromJwt(
      req.app.locals.supabaseUrl,
      req.app.locals.supabaseAnonKey,
      accessToken,
    );
    if (!user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    req.accessToken = accessToken;
    req.authUserId = user.id;
    next();
  } catch (err) {
    console.error('[cvcrm/auth]', err);
    return res.status(500).json({ error: 'Erro de autenticação.' });
  }
}

export function createCvcrmRouter() {
  const router = express.Router();

  router.use(requireAuth);

  router.get('/pending-count', async (_req, res) => {
    try {
      const pending = await getCvcrmPendingCount();
      res.json({ pending });
    } catch (err) {
      console.error('[cvcrm/pending-count]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar fila CVCRM.' });
    }
  });

  router.post('/sync-now', async (_req, res) => {
    try {
      const result = await syncPendingLeads();
      if (result.message === 'fila vazia') {
        return res.status(200).json({ processed: 0, message: 'Nada para atualizar' });
      }
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-now]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar leads do CVCRM.' });
    }
  });

  return router;
}
