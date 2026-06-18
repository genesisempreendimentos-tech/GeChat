import express from 'express';
import { requireAuth } from '../middleware/requireAdmin.mjs';
import { getNotificacoes, marcarNotificacoesLidas } from '../services/notificacoesService.mjs';

export function createNotificacoesRouter() {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      const data = await getNotificacoes(req.authUserId, { limit: req.query.limit });
      res.json(data);
    } catch (err) {
      console.error('[notificacoes]', err);
      res.status(500).json({ error: err?.message ?? 'Erro ao carregar notificações.' });
    }
  });

  router.post('/marcar-lida', requireAuth, async (req, res) => {
    try {
      const data = await marcarNotificacoesLidas(req.authUserId);
      res.json(data);
    } catch (err) {
      console.error('[notificacoes/marcar-lida]', err);
      res.status(500).json({ error: err?.message ?? 'Erro ao marcar notificações.' });
    }
  });

  return router;
}
