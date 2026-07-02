const VALID_APP_STATUSES = new Set([
  'ativo',
  'active',
  'beta',
  'lancamento',
  'lançamento',
  'rascunho',
]);

const INVALID_APP_STATUSES = new Set(['arquivado', 'excluido', 'excluído']);

export function normalizeAppStatus(status) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isAppStatusValid(status) {
  const normalized = normalizeAppStatus(status);
  if (!normalized) return false;
  if (INVALID_APP_STATUSES.has(normalized)) return false;
  return VALID_APP_STATUSES.has(normalized);
}

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function appCandidatesFromSlug(slug) {
  const base = normalizeSlug(slug);
  if (!base) return [];
  return [...new Set([base, base.replace(/-/g, ''), base.replace(/_/g, '')])];
}

function pickValidApp(row) {
  if (!row?.id) return null;
  if (!isAppStatusValid(row.status)) return null;
  return row;
}

/**
 * Resolve app em `public.apps` somente por leitura (slug, url, name).
 * Sem UUID fixo nem INSERT.
 */
export async function findAppBySlug(supabase, slug, hostname = '') {
  const candidates = appCandidatesFromSlug(slug);
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    const exact = await supabase.from('apps').select('*').eq('slug', candidate).maybeSingle();
    if (exact.error) continue;
    const app = pickValidApp(exact.data);
    if (app) return app;
  }

  const host = String(hostname ?? '').trim().toLowerCase();
  if (host) {
    const byUrl = await supabase.from('apps').select('*').ilike('url', `%${host}%`).limit(5);
    if (!byUrl.error && Array.isArray(byUrl.data)) {
      for (const row of byUrl.data) {
        const app = pickValidApp(row);
        if (app) return app;
      }
    }
  }

  for (const candidate of candidates) {
    const byName = await supabase.from('apps').select('*').ilike('name', `%${candidate}%`).limit(5);
    if (byName.error || !Array.isArray(byName.data)) continue;
    for (const row of byName.data) {
      const app = pickValidApp(row);
      if (app) return app;
    }
  }

  return null;
}

export async function userHasAppAccess(supabase, userId, appId) {
  if (!userId || !appId) return false;
  const { data, error } = await supabase
    .from('user_app_access')
    .select('access')
    .eq('user_id', userId)
    .eq('app_id', appId)
    .maybeSingle();
  if (error) return false;
  return data?.access === true;
}

export function resolveAuditSlug() {
  return normalizeSlug(process.env.GECHAT_AUDIT_SLUG || 'gechat') || 'gechat';
}

export function isLocalAuditHostname(hostname) {
  const host = String(hostname ?? '').trim().toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}
