import { resolveUserFromJwt } from '../middleware/authSupabase.mjs';
import { loadProfileForAuthUser } from '../services/supabaseServer.mjs';

export async function authenticateSocket(socket, appLocals) {
  const token = socket.handshake.auth?.token;
  if (!token) {
    throw new Error('Token ausente.');
  }
  const { supabaseUrl, supabaseAnonKey } = appLocals;
  const { user, error } = await resolveUserFromJwt(supabaseUrl, supabaseAnonKey, token);
  if (error || !user) {
    throw new Error('Token inválido.');
  }
  const profile = await loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, token, user);
  return { userId: user.id, profile };
}
