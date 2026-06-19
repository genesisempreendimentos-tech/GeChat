import express from 'express';
import { requireAuth } from '../middleware/requireAdmin.mjs';
import {
  getEmpreendimentosAnalytics,
  listEmpreendimentosGenesis,
  withEmpreendimentosClient,
} from '../services/empreendimentosAdminService.mjs';

export function createEmpreendimentosRouter() {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/analytics', async (_req, res) => {
    try {
      const analytics = await withEmpreendimentosClient((client) =>
        getEmpreendimentosAnalytics(client),
      );
      res.json(analytics);
    } catch (err) {
      console.error('[empreendimentos/analytics]', err);
      res.status(500).json({ error: err.message ?? 'Erro interno.' });
    }
  });

  router.get('/', async (_req, res) => {
    try {
      const rows = await withEmpreendimentosClient((client) => listEmpreendimentosGenesis(client));
      res.json({ empreendimentos: rows });
    } catch (err) {
      console.error('[empreendimentos]', err);
      res.status(500).json({ error: err.message ?? 'Erro interno.' });
    }
  });

  return router;
}
