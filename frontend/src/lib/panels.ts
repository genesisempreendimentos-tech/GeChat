/** Rota principal do GêChat (painel User). */
export const GECHAT_PATH = '/';

/** Prefixo de rotas do painel Vitrine (módulo descartável em `panels/vitrine/`). */
export const VITRINE_PREFIX = '/vitrine';

export type AppPanel = 'user' | 'vitrine' | 'admin';

export const PANEL_HOME: Record<AppPanel, string> = {
  user: '/',
  vitrine: `${VITRINE_PREFIX}/item-1`,
  admin: '/admin/home',
};

export function vitrinePath(subpath: string): string {
  const normalized = subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `${VITRINE_PREFIX}${normalized}`;
}

export function panelFromPathname(pathname: string): AppPanel {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith(VITRINE_PREFIX)) return 'vitrine';
  return 'user';
}

export function settingsPathForPanel(panel: AppPanel): string {
  if (panel === 'admin') return '/admin/home';
  if (panel === 'vitrine') return vitrinePath('/settings');
  return '/settings';
}
