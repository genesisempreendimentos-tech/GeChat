import type { Location } from 'react-router-dom';

export const DEFAULT_POST_AUTH_PATH = '/dashboard';

/**
 * Caminho interno seguro após autenticação (evita open redirect via `location.state`).
 */
export function getSafeInternalReturnPath(from: Location | undefined | null): string {
  if (!from) return DEFAULT_POST_AUTH_PATH;
  const pathname = from.pathname || '';
  const search = from.search || '';
  const hash = from.hash || '';
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return DEFAULT_POST_AUTH_PATH;
  if (pathname.includes('://') || search.includes('://') || hash.includes('://')) {
    return DEFAULT_POST_AUTH_PATH;
  }
  const path = `${pathname}${search}${hash}`;
  return path || DEFAULT_POST_AUTH_PATH;
}
