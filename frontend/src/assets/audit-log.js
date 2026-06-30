/**
 * Auditoria centralizada G?Ads ? public.audit_logs (modelo h?brido: colunas + metadata).
 * Eventos: app_login, app_access_daily (1?/utilizador/app/dia, validado na BD), screen_time_active, screen_time_background.
 * ## Contexto

Este projeto deve enviar auditoria para a **mesma** inst?ncia Supabase que o G?Ads, na tabela **`public.audit_logs`**, usando o mesmo modelo de eventos do ficheiro `audit-log.js` (j? anexado / em contexto).

**Objetivos de produto**

1. **Acesso no dia (DAU por app):** saber se o utilizador **acessou aquele app no dia civil local** ? no m?ximo **1 registo por `(utilizador, app, dia)`**, ac??o **`app_access_daily`**.
2. **Tempo de ecr?:** medir **quanto tempo** o separador esteve em **primeiro plano** vs **em segundo plano / hidden**, via **Page Visibility API**, gravando eventos **`screen_time_active`** e **`screen_time_background`** (cada flush = um `INSERT` com dura??o naquele segmento).

---

## Contrato com a base (`audit_logs`)

Cada `INSERT` deve preencher (como no ficheiro de refer?ncia):

- **`actor_user_id`**: UUID do utilizador (`supabase.auth.getUser()` ? `user.id`). **Nunca** misturar com outra coluna legada; ? a chave para contagem por utilizador.
- **`app_id`**: UUID da linha em **`public.apps`** correspondente a **este** produto (G?Ads), obtido por **slug** (ver abaixo).
- **`action`**: um de: `app_login`, `app_access_daily`, `screen_time_active`, `screen_time_background`.
- **`entity_type`**: `'app'`.
- **`entity_id`**: **slug string** do app (ex.: `G?Ads`), igual ao usado na tabela `apps` / env ? serve como identificador leg?vel no modelo h?brido.
- **`email`**, **`url`**, **`hostname`**: contexto opcional (URL e hostname da p?gina).
- **`screen_time_seconds`** / **`screen_time_ms`**: preenchidos nos eventos `screen_time_*` (dura??o **desse** intervalo).
- **`metadata`**: JSON com pelo menos `event_source: 'app_runtime'`, `visibility_based: true` para `screen_time_*`, mais `referrer` / `browser` se poss?vel.

Tabela: **`audit_logs`**. Inser??es v?m do cliente com **anon key**; ? necess?rio **RLS/pol?ticas** coerentes no Supabase (INSERT com `actor_user_id = auth.uid()`, etc.).

---

## Resolu??o do `app_id` e slug

- Definir vari?vel de ambiente do G?Ads, por exemplo: **`VITE_G?Ads_AUDIT_SLUG=G?Ads`** (ou o slug **exacto** da linha em `public.apps`).
- Fun??o **`auditSlug()`** deve devolver esse slug em min?sculas.
- Implementar **`resolveAppId()`**: `getAppBySlug(auditSlug())` ? `app.id`. Se n?o existir app com esse slug, **n?o** inserir auditoria (log de aviso).
- No G?Ads, ligar isto ao vosso `databaseService` / cliente Supabase existente (o referencial importa `supabase` + `databaseService` de `@/services/supabase`).

---

## Comportamento obrigat?rio (espelhar o ficheiro)

### `app_access_daily` (DAU)

- Ao arranque ap?s sess?o v?lida (`init*Audit()`): chamar **`maybeEmitAppAccessDaily(actor, appId)`**.
- **Deduplica??o:** antes de inserir, consultar se j? existe linha com mesmo `actor_user_id`, `app_id`, `action = 'app_access_daily'`, e **`created_at` no dia civil local** (intervalo meia-noite ? meia-noite local, como `getLocalDayBounds()` + `.gte` / `.lt` em ISO).
- **localStorage:** chave tipo `G?Ads_audit_app_access_daily_${userId}_${appId}_${yyyy-mm-dd}` para evitar queries repetidas no mesmo browser/dia (a BD continua a ser a verdade).

### `screen_time_active` / `screen_time_background`

- Inicializar **`init*Audit()`** depois do login: guardar timestamps quando o documento passa **visible** ? **hidden** (`visibilitychange`; tamb?m `pagehide` onde aplic?vel).
- Quando sai de **visible**, calcular `ms` desde o ?ltimo in?cio ?ativo? e fazer `insertAuditEvent` com `action: 'screen_time_active'` e `screen_time_ms` / `screen_time_seconds`.
- Quando entra em **hidden**, registar tempo em fundo com `screen_time_background`.
- No **sign out**, fazer flush do segmento aberto antes de limpar listeners.
- Exportar **`cleanup`** ao desmontar (remover listeners, unsubscribe `onAuthStateChange` se usado, ?ltimo flush).

### `app_login`

- **`emit*AuditAppLogin(userId, email)`** s? ap?s **login com palavra-passe conclu?do** ? **n?o** chamar em restauro de sess?o / `checkAuth` silencioso.

---

## Adapta??o de nomes (G?Ads ? G?Ads)

Renomear para o projeto atual, mantendo a **l?gica** igual:

- `initG?AdsAudit` ? por exemplo `initG?AdsAudit`.
- `emitG?AdsAuditAppLogin` ? `emitG?AdsAuditAppLogin` (ou nome do produto).
- Prefixo **localStorage** e coment?rios devem usar `G?Ads` (ou o slug escolhido).

Manter **valores literais** de `action` (`app_access_daily`, `screen_time_active`, etc.) **iguais** ao G?Ads para relat?rios cruzados no mesmo `audit_logs`.

---

## Onde chamar no app

1. Ap?s login bem-sucedido: **`emit*AuditAppLogin`**.
2. Quando a app est? autenticada e o router/shell carrega: **`init*Audit()`** (uma vez por ?shell? de sess?o; o ficheiro refer?ncia usa `cleanupRef` para evitar duplicar).
3. Garantir **uma ?nica** inst?ncia Supabase alinhada com a mesma `VITE_SUPABASE_*` que grava em `audit_logs`.

---

## Queries anal?ticas (resumo)

- **?Acedeu hoje?? / contagem de dias com acesso:** filtrar `action = 'app_access_daily'`, `actor_user_id`, `app_id`, agrupar por data de **`created_at`** (dia civil desejado).
- **?Tempo de ecr? primeiro plano?:** somar `screen_time_ms` (ou segundos) onde `action = 'screen_time_active'`, mesmo utilizador e app, no intervalo de datas necess?rio (atentos a m?ltiplos INSERTs por dia).

---

## Entreg?veis esperados no G?Ads

- M?dulo JS/TS equivalente ao `audit-log.js`, com imports do **vosso** `supabase` + fun??o **`getAppBySlug`**.
- Vari?vel de ambiente do **slug** do app G?Ads na tabela `apps`.
- Chamadas integradas no fluxo de auth / `App.tsx` (ou equivalente).
- Confirma??o de que existe **linha em `apps`** para esse slug e **RLS** em `audit_logs` permite INSERT/SELECT conforme necess?rio.

Implementa de ponta a ponta seguindo o ficheiro em contexto, apenas adaptando imports, slug, nomes p?blicos das fun??es e prefixos de storage.
 */
import { supabase, databaseService } from '@/services/supabase';

function auditSlug() {
  return (import.meta.env.VITE_GECHAT_AUDIT_SLUG ?? 'gechat')
    .toString()
    .trim()
    .toLowerCase() || 'gechat';
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
    console.warn('[audit-log] App n?o encontrado para slug:', auditSlug());
    return null;
  }
  return app.id;
}

/**
 * Login com palavra-passe conclu?do (n?o chamar em checkAuth / sess?o restaurada).
 */
export async function emitGeChatAuditAppLogin(userId, email) {
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

/** In?cio e fim do dia civil local (para filtrar created_at). */
function getLocalDayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function appAccessDailyStorageKey(userId, appId) {
  return `gechat_audit_app_access_daily_${userId}_${appId}_${todayLocalDateKey()}`;
}

/**
 * J? existe evento app_access_daily hoje (mesmo utilizador, mesmo app)?
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
 * Presen?a di?ria (DAU): no m?ximo 1? por utilizador por app por dia civil local.
 * Valida??o principal na BD; localStorage evita queries repetidas no mesmo browser/dia.
 */
async function maybeEmitAppAccessDaily(actor, appId) {
  const lsKey = appAccessDailyStorageKey(actor.userId, appId);
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(lsKey)) {
      return;
    }
  } catch {
    /* continuar ? valida??o na BD */
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
 * Inicializa auditoria ap?s autentica??o: app_access_daily (se ainda n?o existir hoje na BD), tempos de ecr?.
 */
export function initGeChatAudit() {
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

