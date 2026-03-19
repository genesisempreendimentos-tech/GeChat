/**
 * Helpers de autenticação Supabase para as rotas /api/* do servidor Node.
 * Módulo separado para não perder definições em merges parciais do index.mjs.
 */
import { createClient } from '@supabase/supabase-js';

/** JWT do header Authorization (Node pode entregar string ou array). */
export function getBearerJwt(req) {
  const raw = req.headers.authorization ?? req.headers.Authorization;
  if (raw == null) return null;
  const h = Array.isArray(raw) ? raw[0] : String(raw);
  const m = h.match(/^Bearer\s+(\S+)/i);
  return m ? m[1].trim() : null;
}

function createSupabaseWithUserJwt(supabaseUrl, supabaseAnonKey, accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  });
}

/**
 * Valida o access_token (getUser com header global; fallback getUser(jwt)).
 */
export async function resolveUserFromJwt(supabaseUrl, supabaseAnonKey, accessToken) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: { message: 'Supabase não configurado' } };
  }
  const withHeader = createSupabaseWithUserJwt(supabaseUrl, supabaseAnonKey, accessToken);
  const r1 = await withHeader.auth.getUser();
  if (!r1.error && r1.data?.user) {
    return { user: r1.data.user, error: null };
  }
  const plain = createClient(supabaseUrl, supabaseAnonKey);
  const r2 = await plain.auth.getUser(accessToken);
  if (!r2.error && r2.data?.user) {
    return { user: r2.data.user, error: null };
  }
  return { user: null, error: r2.error ?? r1.error };
}
