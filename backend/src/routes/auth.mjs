import express from 'express';
import {
  authUserToProfile,
  createSupabaseAnonClient,
  loadProfileForAuthUser,
} from '../services/supabaseServer.mjs';

function authHttpStatus(error) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  if (status >= 500) return 503;
  if (status === 429) return 429;
  return 401;
}

const ACCESS_COOKIE = 'genovo_sb_access';
const REFRESH_COOKIE = 'genovo_sb_refresh';

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

function cookieOptions(req, maxAgeSeconds) {
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = isProduction || req.headers['x-forwarded-proto'] === 'https';
  return [
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    secure ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function setAuthCookies(req, res, session) {
  if (!session?.access_token || !session?.refresh_token) return;
  res.append('Set-Cookie', `${ACCESS_COOKIE}=${encodeURIComponent(session.access_token)}; ${cookieOptions(req, res.locals.accessMaxAge ?? session.expires_in ?? 3600)}`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=${encodeURIComponent(session.refresh_token)}; ${cookieOptions(req, 60 * 60 * 24 * 30)}`);
}

function clearAuthCookies(req, res) {
  res.append('Set-Cookie', `${ACCESS_COOKIE}=; ${cookieOptions(req, 0)}`);
  res.append('Set-Cookie', `${REFRESH_COOKIE}=; ${cookieOptions(req, 0)}`);
}

function requireConfig(req, res, next) {
  if (!req.app.locals.supabaseUrl || !req.app.locals.supabaseAnonKey) {
    return res.status(500).json({ error: 'Supabase não configurado no servidor.' });
  }
  next();
}

async function resolveSessionUser(req, res) {
  const { supabaseUrl, supabaseAnonKey } = req.app.locals;
  const accessToken = readCookie(req, ACCESS_COOKIE);
  const refreshToken = readCookie(req, REFRESH_COOKIE);
  const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey);

  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error && data?.user) {
      const profile = await loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, accessToken, data.user);
      return { authUser: data.user, profile, accessToken };
    }
  }

  if (!refreshToken) return null;
  const refreshed = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (refreshed.error || !refreshed.data?.session?.access_token || !refreshed.data?.user) {
    clearAuthCookies(req, res);
    return null;
  }

  setAuthCookies(req, res, refreshed.data.session);
  const nextAccessToken = refreshed.data.session.access_token;
  const profile = await loadProfileForAuthUser(
    supabaseUrl,
    supabaseAnonKey,
    nextAccessToken,
    refreshed.data.user,
  );
  return { authUser: refreshed.data.user, profile, accessToken: nextAccessToken };
}

export function createAuthRouter() {
  const router = express.Router();
  router.use(requireConfig);

  router.post('/login', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim();
      const password = String(req.body?.password ?? '');
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const { supabaseUrl, supabaseAnonKey } = req.app.locals;
      const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data?.session || !data?.user) {
        return res.status(authHttpStatus(error)).json({
          error: error?.message ?? 'Credenciais inválidas.',
        });
      }

      setAuthCookies(req, res, data.session);
      const profile = await loadProfileForAuthUser(
        supabaseUrl,
        supabaseAnonKey,
        data.session.access_token,
        data.user,
      );
      return res.json({ user: profile ?? authUserToProfile(data.user) });
    } catch (err) {
      console.error('[auth/login]', err);
      return res.status(500).json({ error: 'Erro ao autenticar.' });
    }
  });

  router.post('/signup', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim();
      const password = String(req.body?.password ?? '');
      const fullName = String(req.body?.fullName ?? '').trim();
      const role = String(req.body?.role ?? 'user');
      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
      }

      const { supabaseUrl, supabaseAnonKey } = req.app.locals;
      const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, name: fullName, role } },
      });
      if (error || !data?.user) {
        return res.status(400).json({ error: error?.message ?? 'Erro ao criar usuário.' });
      }
      if (data.session) setAuthCookies(req, res, data.session);
      const profile = data.session
        ? await loadProfileForAuthUser(supabaseUrl, supabaseAnonKey, data.session.access_token, data.user)
        : { id: data.user.id, email: data.user.email, name: fullName, full_name: fullName, role, accessType: role };
      return res.json({ user: profile });
    } catch (err) {
      console.error('[auth/signup]', err);
      return res.status(500).json({ error: 'Erro ao criar conta.' });
    }
  });

  router.post('/logout', async (req, res) => {
    try {
      const { supabaseUrl, supabaseAnonKey } = req.app.locals;
      const accessToken = readCookie(req, ACCESS_COOKIE);
      if (accessToken) {
        const supabase = createSupabaseAnonClient(supabaseUrl, supabaseAnonKey, accessToken);
        await supabase.auth.signOut();
      }
    } catch {
      /* cookie cleanup still wins */
    }
    clearAuthCookies(req, res);
    return res.json({ ok: true });
  });

  router.get('/access-token', async (req, res) => {
    try {
      const sessionUser = await resolveSessionUser(req, res);
      if (!sessionUser?.accessToken) return res.status(401).json({ error: 'Não autenticado.' });
      return res.json({ accessToken: sessionUser.accessToken });
    } catch (err) {
      console.error('[auth/access-token]', err);
      return res.status(500).json({ error: 'Erro ao obter token.' });
    }
  });

  router.get('/me', async (req, res) => {
    try {
      const sessionUser = await resolveSessionUser(req, res);
      if (!sessionUser) return res.status(401).json({ user: null });
      return res.json({ user: sessionUser.profile });
    } catch (err) {
      console.error('[auth/me]', err);
      return res.status(500).json({ error: 'Erro ao validar sessão.' });
    }
  });

  router.post('/reset-password', async (req, res) => {
    try {
      const email = String(req.body?.email ?? '').trim();
      const redirectTo = String(req.body?.redirectTo ?? '').trim() || undefined;
      if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });
      const supabase = createSupabaseAnonClient(req.app.locals.supabaseUrl, req.app.locals.supabaseAnonKey);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ data });
    } catch (err) {
      console.error('[auth/reset-password]', err);
      return res.status(500).json({ error: 'Erro ao solicitar redefinição de senha.' });
    }
  });

  router.patch('/password', async (req, res) => {
    try {
      const password = String(req.body?.password ?? '');
      if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
      const sessionUser = await resolveSessionUser(req, res);
      if (!sessionUser?.accessToken) return res.status(401).json({ error: 'Sessão inválida.' });
      const supabase = createSupabaseAnonClient(
        req.app.locals.supabaseUrl,
        req.app.locals.supabaseAnonKey,
        sessionUser.accessToken,
      );
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) return res.status(400).json({ error: error.message });
      return res.json({ user: data.user ? sessionUser.profile : null });
    } catch (err) {
      console.error('[auth/password]', err);
      return res.status(500).json({ error: 'Erro ao alterar senha.' });
    }
  });

  return router;
}
