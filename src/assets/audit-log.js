/**
 * Auditoria centralizada GeApps → public.audit_logs (modelo híbrido: colunas + metadata).
 * Eventos: app_login, app_access_daily (1×/utilizador/app/dia, validado na BD), screen_time_active, screen_time_background.
 */
import { supabase, databaseService } from '@/services/supabase';

function auditSlug() {
  return (import.meta.env.VITE_GEAPPS_AUDIT_SLUG ?? 'geapps').toString().trim().toLowerCase() || 'geapps';
}

function pageContext() {
  const href = typeof window !== 'undefined' ? window.location.href : '';
  let hostname = '';
  try {
    hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  } catch {
    /* noop */
  }
  return { url: href, hostname };
}

function extraMetadata(action) {
  const vis = typeof action === 'string' && action.startsWith('screen_time');
  const out = {
    event_source: 'app_runtime',
    visibility_based: vis,
  };
  try {
    if (typeof document !== 'undefined' && document.referrer) {
      out.referrer = document.referrer.slice(0, 1024);
    }
  } catch {
    /* noop */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      out.browser = String(navigator.userAgent).slice(0, 512);
    }
  } catch {
    /* noop */
  }
  return out;
}

/**
 * @param {object} p
 * @param {string} p.action
 * @param {string} p.actorUserId
 * @param {string} p.appId
 * @param {string} [p.email]
 * @param {number | null} [p.screenTimeSeconds]
 * @param {number | null} [p.screenTimeMs]
 * @param {Record<string, unknown>} [p.metadataExtra]
 */
async function insertAuditEvent({
  action,
  actorUserId,
  appId,
  email,
  screenTimeSeconds = null,
  screenTimeMs = null,
  metadataExtra = {},
}) {
  const { url, hostname } = pageContext();
  const meta = { ...extraMetadata(action), ...metadataExtra };
  const row = {
    actor_user_id: actorUserId,
    app_id: appId,
    action,
    entity_type: 'app',
    entity_id: auditSlug(),
    email: email ?? null,
    url: url || null,
    hostname: hostname || null,
    screen_time_seconds: screenTimeSeconds != null ? Math.round(screenTimeSeconds) : null,
    screen_time_ms: screenTimeMs != null ? Math.round(screenTimeMs) : null,
    metadata: meta,
  };
  const { error } = await supabase.from('audit_logs').insert(row);
  if (error) {
    console.warn('[audit-log]', action, error.message ?? error);
  }
  return !error;
}

async function getActor() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) return null;
  const email = user.email ?? '';
  return { userId: user.id, email };
}

async function resolveAppId() {
  const { data: app, error } = await databaseService.getAppBySlug(auditSlug());
  if (error || !app?.id) {
    console.warn('[audit-log] App não encontrado para slug:', auditSlug());
    return null;
  }
  return app.id;
}

/**
 * Login com palavra-passe concluído (não chamar em checkAuth / sessão restaurada).
 */
export async function emitGeAppsAuditAppLogin(userId, email) {
  const appId = await resolveAppId();
  if (!appId || !userId) return;
  await insertAuditEvent({
    action: 'app_login',
    actorUserId: userId,
    appId,
    email: email ?? '',
  });
}

function todayLocalDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Início e fim do dia civil local (para filtrar created_at). */
function getLocalDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function appAccessDailyStorageKey(userId, appId) {
  return `geapps_audit_app_access_daily_${userId}_${appId}_${todayLocalDateKey()}`;
}

/**
 * Já existe evento app_access_daily hoje (mesmo utilizador, mesmo app)?
 */
async function hasAppAccessDailyTodayInDb(actorUserId, appId) {
  const { start, end } = getLocalDayBounds();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id')
    .eq('actor_user_id', actorUserId)
    .eq('app_id', appId)
    .eq('action', 'app_access_daily')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .limit(1);
  if (error) {
    console.warn('[audit-log] hasAppAccessDailyTodayInDb', error.message ?? error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * Presença diária (DAU): no máximo 1× por utilizador por app por dia civil local.
 * Validação principal na BD; localStorage evita queries repetidas no mesmo browser/dia.
 */
async function maybeEmitAppAccessDaily(actor, appId) {
  const lsKey = appAccessDailyStorageKey(actor.userId, appId);
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(lsKey)) {
      return;
    }
  } catch {
    /* continuar — validação na BD */
  }

  const alreadyExists = await hasAppAccessDailyTodayInDb(actor.userId, appId);
  if (alreadyExists) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(lsKey, '1');
      }
    } catch {
      /* noop */
    }
    return;
  }

  const ok = await insertAuditEvent({
    action: 'app_access_daily',
    actorUserId: actor.userId,
    appId,
    email: actor.email,
  });
  if (ok) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(lsKey, '1');
      }
    } catch {
      /* noop */
    }
  }
}

let cleanupRef = null;

/**
 * Inicializa auditoria após autenticação: app_access_daily (se ainda não existir hoje na BD), tempos de ecrã.
 */
export function initGeAppsAudit() {
  if (cleanupRef) {
    cleanupRef();
    cleanupRef = null;
  }

  let disposed = false;
  let appIdResolved = null;
  /** @type {number | null} */
  let lastVisibleStart =
    typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null;
  /** @type {number | null} */
  let lastHiddenStart = null;

  async function flushScreenTimeActive(ms) {
    if (disposed || ms <= 0 || !appIdResolved) return;
    const actor = await getActor();
    if (!actor) return;
    const sec = ms / 1000;
    await insertAuditEvent({
      action: 'screen_time_active',
      actorUserId: actor.userId,
      appId: appIdResolved,
      email: actor.email,
      screenTimeSeconds: sec,
      screenTimeMs: ms,
    });
  }

  async function flushScreenTimeBackground(ms) {
    if (disposed || ms <= 0 || !appIdResolved) return;
    const actor = await getActor();
    if (!actor) return;
    const sec = ms / 1000;
    await insertAuditEvent({
      action: 'screen_time_background',
      actorUserId: actor.userId,
      appId: appIdResolved,
      email: actor.email,
      screenTimeSeconds: sec,
      screenTimeMs: ms,
    });
  }

  function onVisibility() {
    if (disposed || typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      if (lastHiddenStart != null) {
        const ms = Date.now() - lastHiddenStart;
        lastHiddenStart = null;
        void flushScreenTimeBackground(ms);
      }
      lastVisibleStart = Date.now();
      return;
    }
    if (lastVisibleStart != null) {
      const ms = Date.now() - lastVisibleStart;
      lastVisibleStart = null;
      void flushScreenTimeActive(ms);
    }
    lastHiddenStart = Date.now();
  }

  function onPageHide() {
    if (disposed || typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden' && lastHiddenStart != null) {
      const ms = Date.now() - lastHiddenStart;
      lastHiddenStart = null;
      void flushScreenTimeBackground(ms);
      return;
    }
    if (document.visibilityState === 'visible' && lastVisibleStart != null) {
      const ms = Date.now() - lastVisibleStart;
      lastVisibleStart = null;
      void flushScreenTimeActive(ms);
    }
  }

  const run = async () => {
    const actor = await getActor();
    if (!actor) return;

    const appId = await resolveAppId();
    if (!appId) return;
    appIdResolved = appId;

    await maybeEmitAppAccessDaily(actor, appIdResolved);

    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        lastVisibleStart = Date.now();
        lastHiddenStart = null;
      } else {
        lastVisibleStart = null;
        lastHiddenStart = Date.now();
      }
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onPageHide);
    }
  };

  void run();

  const {
    data: { subscription: authSubscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      void (async () => {
        if (typeof document !== 'undefined') {
          if (document.visibilityState === 'visible' && lastVisibleStart != null) {
            const ms = Date.now() - lastVisibleStart;
            lastVisibleStart = null;
            await flushScreenTimeActive(ms);
          } else if (document.visibilityState === 'hidden' && lastHiddenStart != null) {
            const ms = Date.now() - lastHiddenStart;
            lastHiddenStart = null;
            await flushScreenTimeBackground(ms);
          }
        }
      })();
    }
  });

  const cleanup = () => {
    disposed = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    }
    authSubscription?.unsubscribe();
    if (typeof document !== 'undefined') {
      if (document.visibilityState === 'visible' && lastVisibleStart != null) {
        const ms = Date.now() - lastVisibleStart;
        lastVisibleStart = null;
        void flushScreenTimeActive(ms);
      } else if (document.visibilityState === 'hidden' && lastHiddenStart != null) {
        const ms = Date.now() - lastHiddenStart;
        lastHiddenStart = null;
        void flushScreenTimeBackground(ms);
      }
    }
  };

  cleanupRef = cleanup;
  return cleanup;
}
