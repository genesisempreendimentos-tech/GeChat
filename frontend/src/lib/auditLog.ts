/**
 * Auditoria GêChat → public.audit_logs (modelo GêApps).
 * Eventos: app_login, app_access_daily, screen_time_active, screen_time_background.
 */
import { supabase } from '@/services/supabase';

export const AUDIT_ACTIONS = [
  'app_login',
  'app_access_daily',
  'screen_time_active',
  'screen_time_background',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

type AuditRow = {
  actor_user_id: string;
  app_id: string;
  action: AuditAction;
  entity_type: 'app';
  entity_id: string;
  email: string | null;
  url: string | null;
  hostname: string | null;
  screen_time_seconds: number | null;
  screen_time_ms: number | null;
  metadata: Record<string, unknown>;
};

type HubAccessResult = {
  allowed: boolean;
  code?: string;
  appId?: string;
  slug?: string;
};

let hubAccessCache: HubAccessResult | null = null;
let cleanupRef: (() => void) | null = null;

export function auditSlug() {
  return (
    (import.meta.env.VITE_GECHAT_AUDIT_SLUG ?? 'gechat').toString().trim().toLowerCase() || 'gechat'
  );
}

export function isLocalAuditHost(hostname?: string) {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : ''))
    .trim()
    .toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function clearAuditHubCache() {
  hubAccessCache = null;
}

export async function checkAppHubAccess(): Promise<HubAccessResult> {
  if (hubAccessCache) return hubAccessCache;
  try {
    const response = await fetch('/api/auth/app-access', { credentials: 'include' });
    const payload = (await response.json().catch(() => ({}))) as HubAccessResult;
    hubAccessCache = payload?.allowed
      ? payload
      : { allowed: false, code: payload?.code ?? 'NO_APP_ACCESS' };
  } catch {
    hubAccessCache = { allowed: false, code: 'ERROR' };
  }
  return hubAccessCache;
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

function extraMetadata(action: AuditAction) {
  const visibilityBased = action.startsWith('screen_time');
  const out: Record<string, unknown> = {
    event_source: 'app_runtime',
    visibility_based: visibilityBased,
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

async function fallbackToApiAudit(row: AuditRow) {
  try {
    const response = await fetch('/api/audit', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => ({}));
    return Boolean((payload as { ok?: boolean }).ok);
  } catch (err) {
    console.warn('[audit] fallback API failed', err);
    return false;
  }
}

async function insertAuditEvent(input: {
  action: AuditAction;
  actorUserId: string;
  appId: string;
  email?: string;
  screenTimeSeconds?: number | null;
  screenTimeMs?: number | null;
  metadataExtra?: Record<string, unknown>;
}) {
  const { url, hostname } = pageContext();
  if (isLocalAuditHost(hostname)) return false;

  const row: AuditRow = {
    actor_user_id: input.actorUserId,
    app_id: input.appId,
    action: input.action,
    entity_type: 'app',
    entity_id: auditSlug(),
    email: input.email ?? null,
    url: url || null,
    hostname: hostname || null,
    screen_time_seconds:
      input.screenTimeSeconds != null ? Math.round(input.screenTimeSeconds) : null,
    screen_time_ms: input.screenTimeMs != null ? Math.round(input.screenTimeMs) : null,
    metadata: { ...extraMetadata(input.action), ...(input.metadataExtra ?? {}) },
  };

  try {
    const { error } = await supabase.from('audit_logs').insert(row);
    if (!error) return true;
    console.warn('[audit] client insert failed', input.action, error.message ?? error);
  } catch (err) {
    console.warn('[audit] client insert threw', input.action, err);
  }

  return fallbackToApiAudit(row);
}

async function getActor() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.id) return null;
  return { userId: user.id, email: user.email ?? '' };
}

async function resolveAppId() {
  const hub = await checkAppHubAccess();
  if (!hub.allowed || !hub.appId) return null;
  return hub.appId;
}

async function canAudit(userId: string) {
  if (isLocalAuditHost()) return false;
  const hub = await checkAppHubAccess();
  return hub.allowed && Boolean(hub.appId) && Boolean(userId);
}

export async function emitGeChatAuditAppLogin(userId: string, email?: string) {
  if (!(await canAudit(userId))) return;
  const appId = await resolveAppId();
  if (!appId) return;
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

function getLocalDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function appAccessDailyStorageKey(userId: string, appId: string) {
  return `gechat_audit_app_access_daily_${userId}_${appId}_${todayLocalDateKey()}`;
}

async function hasAppAccessDailyTodayInDb(actorUserId: string, appId: string) {
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
    console.warn('[audit] hasAppAccessDailyTodayInDb', error.message ?? error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

async function maybeEmitAppAccessDaily(actor: { userId: string; email: string }, appId: string) {
  const lsKey = appAccessDailyStorageKey(actor.userId, appId);
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(lsKey)) return;
  } catch {
    /* continuar */
  }

  const alreadyExists = await hasAppAccessDailyTodayInDb(actor.userId, appId);
  if (alreadyExists) {
    try {
      localStorage.setItem(lsKey, '1');
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
      localStorage.setItem(lsKey, '1');
    } catch {
      /* noop */
    }
  }
}

export function stopGeChatAudit() {
  if (cleanupRef) {
    cleanupRef();
    cleanupRef = null;
  }
}

export function initGeChatAudit() {
  stopGeChatAudit();

  let disposed = false;
  let appIdResolved: string | null = null;
  let lastVisibleStart =
    typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null;
  let lastHiddenStart: number | null = null;

  async function flushScreenTimeActive(ms: number) {
    if (disposed || ms <= 0 || !appIdResolved) return;
    const actor = await getActor();
    if (!actor || !(await canAudit(actor.userId))) return;
    await insertAuditEvent({
      action: 'screen_time_active',
      actorUserId: actor.userId,
      appId: appIdResolved,
      email: actor.email,
      screenTimeSeconds: ms / 1000,
      screenTimeMs: ms,
    });
  }

  async function flushScreenTimeBackground(ms: number) {
    if (disposed || ms <= 0 || !appIdResolved) return;
    const actor = await getActor();
    if (!actor || !(await canAudit(actor.userId))) return;
    await insertAuditEvent({
      action: 'screen_time_background',
      actorUserId: actor.userId,
      appId: appIdResolved,
      email: actor.email,
      screenTimeSeconds: ms / 1000,
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
    if (!actor || !(await canAudit(actor.userId))) return;

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
