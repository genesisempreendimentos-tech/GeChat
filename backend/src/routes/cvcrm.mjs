import express from 'express';
import { getBearerJwt, resolveUserFromJwt } from '../middleware/authSupabase.mjs';
import {
  getCvcrmLeadUpdatesCount,
  getCvcrmPendingCount,
  getCvcrmSyncStatus,
  listCvcrmLeadUpdates,
  syncAllChangedToday,
  syncPendingLeads,
} from '../services/cvcrmBatchSync.mjs';
import {
  getCvcrmReservasPendingCount,
  syncPendingReservas,
} from '../services/cvcrmReservasSync.mjs';
import {
  getCompetenciaReport,
  getCorretoresCount,
  getImobiliariasCount,
  syncCorretores,
  syncImobiliarias,
} from '../services/cvcrmCadastrosSync.mjs';
import { getSyncCursors, runIncrementalSync } from '../services/cvcrmIncrementalSync.mjs';

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

  router.get('/sync-status', async (_req, res) => {
    try {
      const status = await getCvcrmSyncStatus();
      res.json(status);
    } catch (err) {
      console.error('[cvcrm/sync-status]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar status do sync CVCRM.' });
    }
  });

  router.get('/updates/count', async (_req, res) => {
    try {
      const count = await getCvcrmLeadUpdatesCount();
      res.json({ count });
    } catch (err) {
      console.error('[cvcrm/updates/count]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar total de atualizações CVCRM.' });
    }
  });

  router.get('/updates', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 100;
      const offset = Number(req.query.offset) || 0;
      const result = await listCvcrmLeadUpdates(limit, offset);
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/updates]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao listar atualizações CVCRM.' });
    }
  });

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

  router.post('/sync-all', async (_req, res) => {
    try {
      const result = await syncAllChangedToday();
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-all]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao baixar leads do dia no CVCRM.' });
    }
  });

  router.get('/reservas-pending-count', async (_req, res) => {
    try {
      const pending = await getCvcrmReservasPendingCount();
      res.json({ pending });
    } catch (err) {
      console.error('[cvcrm/reservas-pending-count]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar fila de reservas CVCRM.' });
    }
  });

  router.post('/sync-reservas-now', async (req, res) => {
    try {
      const referenceDate =
        typeof req.body?.referenceDate === 'string' ? req.body.referenceDate.trim() : undefined;
      const result = await syncPendingReservas({ referenceDate });
      if (result.message === 'fila vazia') {
        return res.status(200).json({ processed: 0, message: 'Nada para atualizar' });
      }
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-reservas-now]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar reservas do CVCRM.' });
    }
  });

  router.get('/corretores-count', async (_req, res) => {
    try {
      const count = await getCorretoresCount();
      res.json({ count });
    } catch (err) {
      console.error('[cvcrm/corretores-count]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar total de corretores.' });
    }
  });

  router.get('/imobiliarias-count', async (_req, res) => {
    try {
      const count = await getImobiliariasCount();
      res.json({ count });
    } catch (err) {
      console.error('[cvcrm/imobiliarias-count]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar total de imobiliárias.' });
    }
  });

  router.post('/sync-corretores', async (req, res) => {
    try {
      const referenceDate =
        typeof req.body?.referenceDate === 'string' ? req.body.referenceDate.trim() : undefined;
      const result = await syncCorretores({ referenceDate });
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-corretores]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar corretores do CVCRM.' });
    }
  });

  router.post('/sync-imobiliarias', async (req, res) => {
    try {
      const referenceDate =
        typeof req.body?.referenceDate === 'string' ? req.body.referenceDate.trim() : undefined;
      const result = await syncImobiliarias({ referenceDate });
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-imobiliarias]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar imobiliárias do CVCRM.' });
    }
  });

  router.post('/sync-incremental', async (req, res) => {
    try {
      const skipIfRecent = req.body?.skipIfRecent === true;
      const result = await runIncrementalSync({
        skipIfRecentMs: skipIfRecent ? 2 * 60 * 1000 : 0,
      });
      if (result.skipped) {
        return res.status(200).json({ skipped: true, message: result.message, ...result });
      }
      res.json(result);
    } catch (err) {
      console.error('[cvcrm/sync-incremental]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar incrementalmente com o CVCRM.' });
    }
  });

  router.get('/sync-cursors', async (_req, res) => {
    try {
      const cursors = await getSyncCursors();
      res.json(cursors);
    } catch (err) {
      console.error('[cvcrm/sync-cursors]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar cursors de sync.' });
    }
  });

  router.get('/competencia', async (_req, res) => {
    try {
      const report = await getCompetenciaReport();
      res.json(report);
    } catch (err) {
      console.error('[cvcrm/competencia]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao consultar competência CVCRM.' });
    }
  });

  return router;
}
