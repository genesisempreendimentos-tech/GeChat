import type { Theme } from '@/store/themeStore';
import type { ThemeMode } from '@/store/settingsStore';

export type ResolvedAppTheme = 'light' | 'dark' | 'full-dark';

/** Enquanto true, ignora preferências salvas e força o tema escuro em todo o app. */
export const FORCE_DARK_THEME = true;

export const FORCED_APP_THEME: ResolvedAppTheme = 'dark';

const THEME_CLASSES = ['dark', 'full-dark', 'offwhite'] as const;

export function resolveThemeMode(mode: ThemeMode): ResolvedAppTheme {
  if (FORCE_DARK_THEME) return FORCED_APP_THEME;
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (mode === 'full-dark') return 'full-dark';
  if (mode === 'dark') return 'dark';
  return 'light';
}

export function applyResolvedTheme(theme: ResolvedAppTheme) {
  const effective = FORCE_DARK_THEME ? FORCED_APP_THEME : theme;
  const root = document.documentElement;
  root.classList.remove(...THEME_CLASSES);

  if (effective === 'dark') {
    root.classList.add('dark');
  }
  if (effective === 'full-dark') {
    root.classList.add('dark', 'full-dark');
  }
}

export function applyThemeMode(mode: ThemeMode) {
  applyResolvedTheme(resolveThemeMode(mode));
}

export function applyAppTheme(theme: Theme) {
  applyResolvedTheme(theme);
}

export function isDarkThemeActive() {
  return document.documentElement.classList.contains('dark');
}

export function syncForcedThemeStorage() {
  if (!FORCE_DARK_THEME || typeof window === 'undefined') return;

  try {
    const settingsRaw = localStorage.getItem('gestack-settings');
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw);
      if (parsed?.state?.themeMode !== 'dark') {
        parsed.state.themeMode = 'dark';
        localStorage.setItem('gestack-settings', JSON.stringify(parsed));
      }
    }

    const themeRaw = localStorage.getItem('theme-storage');
    if (themeRaw) {
      const parsed = JSON.parse(themeRaw);
      if (parsed?.state?.theme !== 'dark') {
        parsed.state.theme = 'dark';
        localStorage.setItem('theme-storage', JSON.stringify(parsed));
      }
    }
  } catch {
    /* ignore */
  }
}
