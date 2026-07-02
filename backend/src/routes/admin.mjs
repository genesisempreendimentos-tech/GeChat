import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../middleware/requireAdmin.mjs';
import {
  getOverviewStats,
  getMessageActivity,
  getConversationsOverview,
  pingNeon,
} from '../services/admin/stats.service.mjs';
import { listAdminUsers } from '../services/admin/users.service.mjs';
import {
  getAdminConversationDetail,
  getAdminConversationMessages,
} from '../services/admin/conversation.service.mjs';
import { getOnlineUserIds } from '../realtime/presence-manager.mjs';

export function createAdminRouter() {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ error: 'GêChat indisponível: DATABASE_URL não configurada.' });
    }
    next();
  });

  router.use(requireAdmin);

  router.get('/overview', async (_req, res) => {
    try {
      const overview = await getOverviewStats();
      res.json({ overview });
    } catch (err) {
      console.error('[admin/overview]', err);
      res.status(500).json({ error: 'Erro ao carregar visão geral.' });
    }
  });

  router.get('/activity', async (req, res) => {
    try {
      const activity = await getMessageActivity(req.query.days);
      res.json(activity);
    } catch (err) {
      console.error('[admin/activity]', err);
      res.status(500).json({ error: 'Erro ao carregar atividade.' });
    }
  });

  router.get('/conversations/:id', async (req, res) => {
    try {
      const detail = await getAdminConversationDetail(req.params.id, req.app.locals);
      res.json(detail);
    } catch (err) {
      const status = err?.status ?? 500;
      if (status !== 500) {
        return res.status(status).json({ error: err.message });
      }
      console.error('[admin/conversations/:id]', err);
      res.status(500).json({ error: 'Erro ao carregar conversa.' });
    }
  });

  router.get('/conversations/:id/messages', async (req, res) => {
    try {
      const result = await getAdminConversationMessages(req.params.id, {
        cursor: req.query.cursor,
        limit: req.query.limit,
      });
      res.json(result);
    } catch (err) {
      console.error('[admin/conversations/:id/messages]', err);
      res.status(500).json({ error: 'Erro ao carregar mensagens.' });
    }
  });

  router.get('/conversations', async (req, res) => {
    try {
      const conversations = await getConversationsOverview(req.query.limit, req.app.locals);
      res.json({ conversations });
    } catch (err) {
      console.error('[admin/conversations]', err);
      res.status(500).json({ error: 'Erro ao listar conversas.' });
    }
  });

  router.get('/users', async (req, res) => {
    try {
      const users = await listAdminUsers(req.app.locals);
      res.json({ users });
    } catch (err) {
      console.error('[admin/users]', err);
      res.status(500).json({ error: err?.message ?? 'Erro ao listar usuários.' });
    }
  });

  router.get('/health', async (req, res) => {
    const health = {
      api: true,
      neon: false,
      supabase: false,
      socketConnections: 0,
      onlineUsers: getOnlineUserIds().length,
    };

    try {
      await pingNeon();
      health.neon = true;
    } catch (err) {
      console.error('[admin/health] neon:', err?.message ?? err);
    }

    try {
      const { supabaseUrl, supabaseServiceRoleKey } = req.app.locals;
      if (supabaseUrl && supabaseServiceRoleKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        const { error } = await supabase.from('profiles').select('user_id').limit(1);
        health.supabase = !error;
      }
    } catch (err) {
      console.error('[admin/health] supabase:', err?.message ?? err);
    }

    const io = req.app.locals.io;
    if (io?.engine?.clientsCount != null) {
      health.socketConnections = io.engine.clientsCount;
    }

    res.json({ health });
  });

  return router;
}
