/**
 * Persistência de auth: localStorage no origin atual.
 */

function noopStorage(): Storage {
  const mem = new Map<string, string>();
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k, v) => {
      mem.set(k, v);
    },
    removeItem: (k) => {
      mem.delete(k);
    },
    clear: () => {
      mem.clear();
    },
    get length() {
      return mem.size;
    },
    key: (i) => Array.from(mem.keys())[i] ?? null,
  };
}

export function getAuthStorage(): Storage {
  if (typeof window === 'undefined') return noopStorage();
  try {
    return localStorage;
  } catch {
    return noopStorage();
  }
}

export const GEADS_BASE_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : '';

export function isAllowedReturnToUrl(url: string): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const u = new URL(url, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}
