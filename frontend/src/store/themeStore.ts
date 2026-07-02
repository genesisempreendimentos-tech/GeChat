import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  appThemeToProfileThema,
  profileThemaToAppTheme,
  type AppThemeId,
} from '@/lib/themeMapping';
import { applyAppTheme, FORCE_DARK_THEME, syncForcedThemeStorage } from '@/lib/applyAppTheme';
import { databaseService, supabase } from '@/services/supabase';

export type Theme = AppThemeId;

const THEME_ORDER: Theme[] = ['light', 'dark', 'full-dark'];

/** Chave do persist do zustand — outras abas recebem `storage` quando esta muda. */
export const THEME_STORAGE_KEY = 'theme-storage';

function syncSettingsThemeMode(theme: Theme) {
  void import('@/store/settingsStore').then(({ useSettingsStore }) => {
    useSettingsStore.setState({ themeMode: theme });
  });
}

async function persistThemaToProfile(theme: Theme) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return;
  const thema = appThemeToProfileThema(theme);
  const { error } = await databaseService.updateProfileThema(user.id, thema);
  if (error) console.warn('[theme] Falha ao salvar thema no perfil:', error);
}

function applyTheme(theme: Theme) {
  if (FORCE_DARK_THEME) {
    applyAppTheme('dark');
    syncForcedThemeStorage();
    return;
  }
  applyAppTheme(theme);
}

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  /** Aplica tema vindo do `profiles.thema` (sem gravar de volta no Supabase). */
  applyFromProfileThema: (thema: string | null | undefined) => void;
  /** Outra aba alterou `localStorage` — alinha UI e store sem novo UPDATE no banco. */
  syncFromOtherTab: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const idx = THEME_ORDER.indexOf(state.theme);
          const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
          applyTheme(next);
          syncSettingsThemeMode(next);
          void persistThemaToProfile(next);
          return { theme: next };
        }),
      setTheme: (theme: Theme) => {
        applyTheme(theme);
        set({ theme });
        syncSettingsThemeMode(theme);
        void persistThemaToProfile(theme);
      },
      applyFromProfileThema: (thema) => {
        if (!thema) return;
        const next = profileThemaToAppTheme(thema);
        applyTheme(next);
        syncSettingsThemeMode(next);
        if (get().theme === next) return;
        set({ theme: next });
      },
      syncFromOtherTab: (theme) => {
        if (get().theme === theme) {
          applyTheme(theme);
          return;
        }
        applyTheme(theme);
        set({ theme });
        syncSettingsThemeMode(theme);
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (FORCE_DARK_THEME) {
          applyTheme('dark');
          syncForcedThemeStorage();
          if (state) state.theme = 'dark';
          return;
        }
        if (state) applyTheme(state.theme);
      },
    }
  )
);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== THEME_STORAGE_KEY || e.newValue == null) return;
    try {
      const parsed = JSON.parse(e.newValue);
      let theme = parsed?.state?.theme as string | undefined;
      if (theme === 'offwhite') theme = 'full-dark';
      if (theme && THEME_ORDER.includes(theme as Theme)) {
        useThemeStore.getState().syncFromOtherTab(theme as Theme);
      }
    } catch {
      /* ignore */
    }
  });
}
