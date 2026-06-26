import { getBearerJwt, resolveUserFromJwt } from './authSupabase.mjs';
import { loadProfileForAuthUser } from '../services/supabaseServer.mjs';

const ACCESS_COOKIE = 'gechat_sb_access';
const REFRESH_COOKIE = 'gechat_sb_refresh';

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

export async function resolveAccessToken(req, res) {
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

export async function requireAuth(req, res, next) {
  try {
    const accessToken = await resolveAccessToken(req, res);
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
    console.error('[auth]', err);
    return res.status(500).json({ error: 'Erro de autenticação.' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const accessToken = await resolveAccessToken(req, res);
    if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });

    const { supabaseUrl, supabaseAnonKey } = req.app.locals;
    const { user } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, accessToken);
    if (!user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    const profile = await loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, accessToken, user);
    if (profile.accessType !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    req.accessToken = accessToken;
    req.authUserId = user.id;
    req.authProfile = profile;
    next();
  } catch (err) {
    console.error('[auth/admin]', err);
    return res.status(500).json({ error: 'Erro de autenticação.' });
  }
}
