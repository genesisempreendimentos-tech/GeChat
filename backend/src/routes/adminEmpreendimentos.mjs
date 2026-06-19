import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/requireAdmin.mjs';
import {
  assignAliasesToEmpreendimento,
  getEmpreendimentoGenesis,
  getEmpreendimentosAnalytics,
  listAliasClusters,
  listAllAliases,
  listEmpreendimentosGenesis,
  markAliasesNaoInformado,
  saveEmpreendimentoGenesis,
  withEmpreendimentosClient,
} from '../services/empreendimentosAdminService.mjs';
import { uploadEmpreendimentoLogo } from '../services/empreendimentosLogoUpload.mjs';
import { invalidateEmpreendimentoResolver } from '../services/empreendimentoResolver.mjs';

const VALID_STATUS = new Set(['a_classificar', 'mapeado', 'nao_informado']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LOGO_MAX_BYTES, files: 1 },
});

function handleServiceError(res, err) {
  const status = err.statusCode ?? 500;
  if (status >= 500) console.error('[admin/empreendimentos]', err);
  return res.status(status).json({ error: err.message ?? 'Erro interno.' });
}

function handleLogoUpload(req, res, next) {
  logoUpload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Imagem deve ter no máximo 2 MB.' });
    }
    console.error('[admin/empreendimentos/logo] multer:', err);
    return res.status(400).json({ error: err.message ?? 'Upload inválido.' });
  });
}

export function createAdminEmpreendimentosRouter() {
  const router = express.Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const rows = await withEmpreendimentosClient((client) => listEmpreendimentosGenesis(client));
      const stats = await withEmpreendimentosClient((client) =>
        listAliasClusters(client, { statusFilter: null }).then((r) => r.stats),
      );
      res.json({ empreendimentos: rows, stats });
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.get('/analytics', async (_req, res) => {
    try {
      const analytics = await withEmpreendimentosClient((client) =>
        getEmpreendimentosAnalytics(client),
      );
      res.json(analytics);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.get('/aliases/all', async (_req, res) => {
    try {
      const data = await withEmpreendimentosClient((client) => listAllAliases(client));
      res.json(data);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.get('/aliases', async (req, res) => {
    try {
      const status = String(req.query.status ?? '').trim();
      const statusFilter = VALID_STATUS.has(status) ? status : null;
      const data = await withEmpreendimentosClient((client) =>
        listAliasClusters(client, { statusFilter }),
      );
      res.json(data);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.post('/logo', handleLogoUpload, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Campo file é obrigatório (multipart/form-data).' });
      }
      const { supabaseUrl, supabaseServiceRoleKey } = req.app.locals;
      const result = await uploadEmpreendimentoLogo(supabaseUrl, supabaseServiceRoleKey, {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
      });
      res.json(result);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const row = await withEmpreendimentosClient((client) =>
        getEmpreendimentoGenesis(client, req.params.id),
      );
      res.json(row);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.post('/', async (req, res) => {
    try {
      const row = await withEmpreendimentosClient((client) =>
        saveEmpreendimentoGenesis(client, req.body),
      );
      res.status(201).json(row);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Já existe empreendimento com esse nome.' });
      }
      return handleServiceError(res, err);
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const row = await withEmpreendimentosClient((client) =>
        saveEmpreendimentoGenesis(client, req.body, { id: req.params.id }),
      );
      res.json(row);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Já existe empreendimento com esse nome.' });
      }
      return handleServiceError(res, err);
    }
  });

  router.post('/aliases/assign', async (req, res) => {
    try {
      const result = await withEmpreendimentosClient((client) =>
        assignAliasesToEmpreendimento(
          client,
          req.body?.alias_ids,
          req.body?.empreendimento_id,
        ),
      );
      invalidateEmpreendimentoResolver();
      res.json(result);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  router.post('/aliases/mark-nao-informado', async (req, res) => {
    try {
      const result = await withEmpreendimentosClient((client) =>
        markAliasesNaoInformado(client, req.body?.alias_ids),
      );
      invalidateEmpreendimentoResolver();
      res.json(result);
    } catch (err) {
      return handleServiceError(res, err);
    }
  });

  return router;
}
