/**
 * Verifica se existe linha em public.profiles para o e-mail (merge corporativo só com perfil GeNovo).
 * Com SUPABASE_SERVICE_ROLE_KEY no servidor, ignora RLS (admins podem ver popups de outros membros).
 * Sem service role, usa o JWT do utilizador (só vê perfis que a RLS permitir).
 */
import { createClient } from '@supabase/supabase-js';

export async function profileExistsInSupabase(
  supabaseUrl,
  supabaseAnonKey,
  accessToken,
  serviceRoleKey,
  email,
) {
  const normalized = String(email ?? '').trim().toLowerCase();
  if (!normalized) return false;

  const sr = serviceRoleKey && String(serviceRoleKey).trim();
  if (sr) {
    const sb = createClient(supabaseUrl, sr, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb
      .from('profiles')
      .select('id')
      .ilike('email', normalized)
      .maybeSingle();
    if (error) {
      console.warn('[profileExists]', error.message);
      return false;
    }
    return !!data;
  }

  const sb = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await sb
    .from('profiles')
    .select('id')
    .ilike('email', normalized)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}
