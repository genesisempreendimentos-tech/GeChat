import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'offwhite';

const THEME_ORDER: Theme[] = ['light', 'dark', 'offwhite'];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'offwhite');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'offwhite') root.classList.add('offwhite');
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      toggleTheme: () =>
        set((state) => {
          const idx = THEME_ORDER.indexOf(state.theme);
          const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
          applyTheme(next);
          return { theme: next };
        }),
      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const theme = parsed?.state?.theme as Theme | undefined;
      if (theme && THEME_ORDER.includes(theme)) applyTheme(theme);
      else applyTheme('light');
    } catch {
      applyTheme('light');
    }
  }
}
