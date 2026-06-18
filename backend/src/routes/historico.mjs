import express from 'express';
import { requireAuth } from '../middleware/requireAdmin.mjs';
import { listHistoricoMovimentacoes } from '../services/historicoService.mjs';

export function createHistoricoRouter() {
  const router = express.Router();

  router.get('/', requireAuth, async (req, res) => {
    try {
      const result = await listHistoricoMovimentacoes({
        page: req.query.page,
        limit: req.query.limit,
        tipo: req.query.tipo,
        tipos: req.query.tipos,
        empreendimento: req.query.empreendimento,
        data_de: req.query.data_de,
        data_ate: req.query.data_ate,
        busca: req.query.busca,
      });
      res.json(result);
    } catch (err) {
      console.error('[historico]', err);
      res.status(500).json({ error: err?.message ?? 'Erro ao carregar histórico.' });
    }
  });

  return router;
}
