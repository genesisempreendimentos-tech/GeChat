/**
 * Storage de autenticação compartilhado entre subdomínios de genesisapps.com.br.
 * Usa cookies com domain=.genesisapps.com.br para que a sessão do Supabase Auth
 * seja visível em geapps.genesisapps.com.br, geteams.genesisapps.com.br, etc.
 */

const AUTH_COOKIE_PREFIX = 'geapps-auth';
const COOKIE_MAX_AGE_DAYS = 365;
const ALLOWED_DOMAIN = 'genesisapps.com.br';

function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname.toLowerCase();
  if (host === ALLOWED_DOMAIN || host.endsWith('.' + ALLOWED_DOMAIN)) {
    return '.' + ALLOWED_DOMAIN;
  }
  return undefined;
}

function isCrossSubdomainEnv(): boolean {
  return typeof getCookieDomain() === 'string';
}

function cookieName(key: string): string {
  return `${AUTH_COOKIE_PREFIX}-${key.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
}

function getCookie(key: string): string | null {
  if (typeof document === 'undefined') return null;
  const name = cookieName(key);
  const parts = document.cookie.split('; ');
  for (const part of parts) {
    const [k, ...vParts] = part.split('=');
    if (k === name) return decodeURIComponent(vParts.join('=').replace(/^"/, '').replace(/"$/, ''));
  }
  return null;
}

function setCookie(key: string, value: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  if (!domain) return;
  const name = cookieName(key);
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  let cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  if (domain) cookie += `; domain=${domain}`;
  if (window.location?.protocol === 'https:') cookie += '; Secure';
  document.cookie = cookie;
}

function removeCookie(key: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  const name = cookieName(key);
  let cookie = `${name}=; path=/; max-age=0`;
  if (domain) cookie += `; domain=${domain}`;
  document.cookie = cookie;
}

/**
 * Storage adapter para Supabase Auth que persiste em cookies no domínio pai
 * quando o host é *.genesisapps.com.br. Caso contrário, usa localStorage.
 */
export function getAuthStorage(): Storage {
  const useCookies = isCrossSubdomainEnv();

  const storage: Storage = {
    getItem(key: string): string | null {
      if (useCookies) return getCookie(key);
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      if (useCookies) {
        setCookie(key, value);
        return;
      }
      try {
        localStorage.setItem(key, value);
      } catch {
        // e.g. quota exceeded or private mode
      }
    },
    removeItem(key: string): void {
      if (useCookies) {
        removeCookie(key);
        return;
      }
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
    get length(): number {
      if (useCookies) {
        const prefix = AUTH_COOKIE_PREFIX + '-';
        return document.cookie.split('; ').filter((s) => s.startsWith(prefix)).length;
      }
      return localStorage.length;
    },
    key(index: number): string | null {
      if (useCookies) {
        const prefix = AUTH_COOKIE_PREFIX + '-';
        const keys = document.cookie
          .split('; ')
          .map((s) => s.split('=')[0])
          .filter((k) => k.startsWith(prefix))
          .map((k) => k.slice(prefix.length));
        return keys[index] ?? null;
      }
      return localStorage.key(index);
    },
    clear(): void {
      if (useCookies) {
        const prefix = AUTH_COOKIE_PREFIX + '-';
        document.cookie
          .split('; ')
          .map((s) => s.split('=')[0])
          .filter((k) => k.startsWith(prefix))
          .forEach((k) => removeCookie(k.replace(prefix, '')));
        return;
      }
      try {
        localStorage.clear();
      } catch {
        // ignore
      }
    },
  };

  return storage;
}

/** URL base do GêApps (login central). */
export const GEAPPS_BASE_URL =
  typeof window !== 'undefined' && window.location?.hostname?.toLowerCase().endsWith(ALLOWED_DOMAIN)
    ? `https://geapps.${ALLOWED_DOMAIN}`
    : (import.meta.env.VITE_GEAPPS_BASE_URL as string | undefined) || 'https://geapps.genesisapps.com.br';

/**
 * Valida se a URL é permitida para redirect após login (evita open redirect).
 * Apenas HTTPS e host em *.genesisapps.com.br.
 */
export function isAllowedReturnToUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host !== ALLOWED_DOMAIN && !host.endsWith('.' + ALLOWED_DOMAIN)) return false;
    return true;
  } catch {
    return false;
  }
}
