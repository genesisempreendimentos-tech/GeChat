import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAnonClient } from '../services/supabaseServer.mjs';
import {
  findAppBySlug,
  isLocalAuditHostname,
  resolveAuditSlug,
  userHasAppAccess,
} from '../services/appsSupabase.mjs';

const AUDIT_ACTIONS = new Set([
  'app_login',
  'app_access_daily',
  'screen_time_active',
  'screen_time_background',
]);

const ACCESS_COOKIE = 'gechat_sb_access';

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

function createServiceClient(req) {
  const { supabaseUrl, supabaseServiceRoleKey } = req.app.locals;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeAuditRow(body, sessionUserId) {
  const actorUserId = String(body?.actor_user_id ?? '').trim();
  if (!actorUserId || actorUserId !== sessionUserId) {
    return { error: 'actor_user_id inválido.' };
  }

  const action = String(body?.action ?? '').trim();
  if (!AUDIT_ACTIONS.has(action)) {
    return { error: 'action inválida.' };
  }

  const hostname = String(body?.hostname ?? '').trim().toLowerCase();
  if (isLocalAuditHostname(hostname)) {
    return { error: 'Auditoria bloqueada em localhost.' };
  }

  const row = {
    actor_user_id: actorUserId,
    target_user_id: body?.target_user_id ?? null,
    app_id: body?.app_id ?? null,
    action,
    entity_type: body?.entity_type ?? 'app',
    entity_id: body?.entity_id ?? null,
    metadata:
      body?.metadata && typeof body.metadata === 'object' ? body.metadata : { event_source: 'app_runtime' },
    email: body?.email ?? null,
    url: body?.url ?? null,
    hostname: hostname || null,
    screen_time_seconds:
      body?.screen_time_seconds != null ? Math.round(Number(body.screen_time_seconds)) : null,
    screen_time_ms: body?.screen_time_ms != null ? Math.round(Number(body.screen_time_ms)) : null,
  };

  if (!row.app_id) return { error: 'app_id obrigatório.' };
  return { row };
}

export function createAuditRouter() {
  const router = express.Router();

  router.post('/', async (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.app.locals;
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Supabase não configurado.' });
      }

      const accessToken = readCookie(req, ACCESS_COOKIE);
      if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });

      const supabaseUser = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey, accessToken);
      const { data: userData, error: userError } = await supabaseUser.auth.getUser(accessToken);
      if (userError || !userData?.user?.id) {
        return res.status(401).json({ error: 'Sessão inválida.' });
      }

      const parsed = sanitizeAuditRow(req.body, userData.user.id);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const slug = resolveAuditSlug();
      const app = await findAppBySlug(supabaseUser, slug, parsed.row.hostname);
      if (!app?.id || app.id !== parsed.row.app_id) {
        return res.status(403).json({ error: 'App não autorizado para auditoria.' });
      }

      const allowed = await userHasAppAccess(supabaseUser, userData.user.id, app.id);
      if (!allowed) return res.status(403).json({ error: 'Sem acesso ao app.' });

      const service = createServiceClient(req);
      if (!service) return res.status(500).json({ error: 'Service role indisponível.' });

      const { error } = await service.from('audit_logs').insert(parsed.row);
      if (error) {
        console.warn('[audit]', error.message ?? error);
        return res.status(500).json({ error: 'Falha ao gravar auditoria.' });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('[audit]', err);
      return res.status(500).json({ error: 'Erro ao gravar auditoria.' });
    }
  });

  return router;
}
