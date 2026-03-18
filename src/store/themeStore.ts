import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'full-dark';

const THEME_ORDER: Theme[] = ['light', 'dark', 'full-dark'];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'full-dark', 'offwhite');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'full-dark') {
    // full-dark herda as variáveis CSS de .full-dark e também precisa da classe
    // dark para que as variantes dark: do Tailwind funcionem
    root.classList.add('dark', 'full-dark');
  }
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
      let theme = parsed?.state?.theme as string | undefined;
      // Migração: offwhite era o antigo 3º tema, agora é full-dark
      if (theme === 'offwhite') {
        theme = 'full-dark';
        parsed.state.theme = 'full-dark';
        localStorage.setItem('theme-storage', JSON.stringify(parsed));
      }
      if (theme && THEME_ORDER.includes(theme as Theme)) applyTheme(theme as Theme);
      else applyTheme('light');
    } catch {
      applyTheme('light');
    }
  }
}
