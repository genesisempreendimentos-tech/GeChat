import express from 'express';
import { requireAuth } from '../middleware/requireAdmin.mjs';
import {
  getEmpreendimentosAnalytics,
  getEmpreendimentoGenesis,
  listEmpreendimentosGenesis,
  parseEmpreendimentosDateFilter,
  withEmpreendimentosClient,
} from '../services/empreendimentosAdminService.mjs';

export function createEmpreendimentosRouter() {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/analytics', async (req, res) => {
    try {
      const dateFilter = parseEmpreendimentosDateFilter(req.query);
      const analytics = await withEmpreendimentosClient((client) =>
        getEmpreendimentosAnalytics(client, dateFilter),
      );
      res.json(analytics);
    } catch (err) {
      console.error('[empreendimentos/analytics]', err);
      res.status(500).json({ error: err.message ?? 'Erro interno.' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const dateFilter = parseEmpreendimentosDateFilter(req.query);
      const rows = await withEmpreendimentosClient((client) =>
        listEmpreendimentosGenesis(client, dateFilter),
      );
      res.json({ empreendimentos: rows });
    } catch (err) {
      console.error('[empreendimentos]', err);
      res.status(500).json({ error: err.message ?? 'Erro interno.' });
    }
  });

  router.get('/:id/aliases', async (req, res) => {
    try {
      const row = await withEmpreendimentosClient((client) =>
        getEmpreendimentoGenesis(client, req.params.id),
      );
      res.json({ id: row.id, nome: row.nome, aliases: row.aliases });
    } catch (err) {
      console.error('[empreendimentos/:id/aliases]', err);
      const status = err.statusCode ?? 500;
      res.status(status).json({ error: err.message ?? 'Erro interno.' });
    }
  });

  return router;
}
