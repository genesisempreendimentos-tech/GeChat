import express from 'express';
import pg from 'pg';
import { getBearerJwt, resolveUserFromJwt } from '../middleware/authSupabase.mjs';
import { syncLeadsFromSources } from '../services/leadSourceSync.mjs';
import { listLeads, getLeadStats, getLeadById, LEAD_STATUSES } from '../services/leadsService.mjs';
import { sendLeadToCvcrm } from '../services/cvcrmService.mjs';
import { processCvcrmWebhook } from '../services/cvcrmWebhook.mjs';

function getNeonLeadsUrl() {
  return process.env.NEON_LEADS_DATABASE_URL || process.env.NEON_GELEADS_DATABASE_URL || null;
}

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

export function createCvcrmWebhookRouter() {
  const router = express.Router();

  router.post('/cvcrm', (req, res) => {
    res.status(200).json({ ok: true });
    void processCvcrmWebhook(req.body).catch((err) => {
      console.error('[cvcrm/webhook]', err);
    });
  });

  return router;
}

export function createLeadsRouter() {
  const router = express.Router();

  router.post('/cvcrm/sync-pending', async (_req, res) => {
    const neonUrl = getNeonLeadsUrl();
    if (!neonUrl) {
      return res.status(500).json({ error: 'NEON_LEADS_DATABASE_URL não configurada.' });
    }

    const client = new pg.Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: true } });
    try {
      await client.connect();

      const { rows } = await client.query(
        `SELECT *
         FROM leads_solar_bosque
         WHERE cvcrm_sync_status = 'pending'
           AND cvcrm_lead_id IS NULL
         ORDER BY created_at ASC`,
      );

      let synced = 0;
      let errors = 0;

      for (const lead of rows) {
        const result = await sendLeadToCvcrm({ ...lead, source_table: 'leads_solar_bosque' });

        if (result.ok) {
          await client.query(
            `UPDATE leads_solar_bosque
             SET cvcrm_lead_id = $1,
                 cvcrm_sync_status = 'synced',
                 cvcrm_last_synced_at = now(),
                 cvcrm_payload = $2::jsonb,
                 cvcrm_sync_error = NULL,
                 updated_at = now()
             WHERE id = $3`,
            [result.cvcrm_lead_id ?? null, JSON.stringify(result.payload ?? {}), lead.id],
          );
          synced += 1;
        } else {
          await client.query(
            `UPDATE leads_solar_bosque
             SET cvcrm_sync_status = 'error',
                 cvcrm_sync_error = $1,
                 updated_at = now()
             WHERE id = $2`,
            [result.error ?? 'Erro desconhecido ao enviar para o CVCRM', lead.id],
          );
          errors += 1;
        }
      }

      res.json({ total: rows.length, synced, errors });
    } catch (err) {
      console.error('[leads/cvcrm/sync-pending]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar leads pendentes com o CVCRM.' });
    } finally {
      await client.end().catch(() => {});
    }
  });

  router.use(requireAuth);

  router.get('/statuses', (_req, res) => {
    res.json({ statuses: LEAD_STATUSES });
  });

  router.post('/sync', async (_req, res) => {
    try {
      const result = await syncLeadsFromSources({ force: true });
      res.json(result);
    } catch (err) {
      console.error('[leads/sync]', err);
      res.status(500).json({ error: err.message ?? 'Erro ao sincronizar leads.' });
    }
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
