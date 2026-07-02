import {
  applyResolvedTheme,
  resolveThemeMode,
  type ResolvedAppTheme,
} from '@/lib/applyAppTheme';
import type { ThemeMode } from '@/store/settingsStore';

const THEME_STORAGE_KEY = 'theme-storage';

function readStoredTheme(): ResolvedAppTheme {
  if (typeof window === 'undefined') return 'dark';

  try {
    const settingsRaw = localStorage.getItem('gestack-settings');
    if (settingsRaw) {
      const mode = JSON.parse(settingsRaw)?.state?.themeMode as ThemeMode | undefined;
      if (mode) return resolveThemeMode(mode);
    }

    const themeRaw = localStorage.getItem(THEME_STORAGE_KEY);
    if (themeRaw) {
      let theme = JSON.parse(themeRaw)?.state?.theme as string | undefined;
      if (theme === 'offwhite') theme = 'full-dark';
      if (theme === 'light' || theme === 'dark' || theme === 'full-dark') {
        return theme;
      }
    }
  } catch {
    /* ignore */
  }

  return 'dark';
}

applyResolvedTheme(readStoredTheme());
