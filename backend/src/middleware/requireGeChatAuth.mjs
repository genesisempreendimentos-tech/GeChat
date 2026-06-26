import { getBearerJwt, resolveUserFromJwt } from './authSupabase.mjs';
import { loadProfileForAuthUser } from '../services/supabaseServer.mjs';

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

export function getAccessTokenFromRequest(req) {
  return getBearerJwt(req) ?? readCookie(req, ACCESS_COOKIE);
}

export async function requireGeChatAuth(req, res, next) {
  const { supabaseUrl, supabaseAnonKey } = req.app.locals;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase não configurado.' });
  }

  const token = getAccessTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });

  const { user, error } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
  if (error || !user) return res.status(401).json({ error: 'Sessão inválida.' });

  const profile = await loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, token, user);
  req.gechatUser = { id: user.id, profile, accessToken: token };
  next();
}
