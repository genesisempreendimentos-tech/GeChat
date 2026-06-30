/** Rota principal do GêChat (painel User). */
export const GECHAT_PATH = '/';

export type AppPanel = 'user' | 'admin';

export const PANEL_HOME: Record<AppPanel, string> = {
  user: '/',
  admin: '/admin/home',
};

export function panelFromPathname(pathname: string): AppPanel {
  if (pathname.startsWith('/admin')) return 'admin';
  return 'user';
}

export function settingsPathForPanel(panel: AppPanel): string {
  if (panel === 'admin') return '/admin/home';
  return '/settings';
}
