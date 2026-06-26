import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyThemeMode, syncForcedThemeStorage, FORCE_DARK_THEME } from '@/lib/applyAppTheme';
import { useThemeStore, type Theme } from '@/store/themeStore';

import type { ChatWallpaperId } from '@/modules/gechat/lib/chat-wallpapers';
import { DEFAULT_CHAT_WALLPAPER_INTENSITY } from '@/modules/gechat/lib/chat-wallpapers';

export type ThemeMode = 'light' | 'dark' | 'system' | 'full-dark';
export type FontSize = 'small' | 'medium' | 'large';
export type AccentColor = 'teal' | 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface SettingsState {
  themeMode: ThemeMode;
  fontSize: FontSize;
  accentColor: AccentColor;
  compactMode: boolean;
  animations: boolean;
  chatWallpaperId: ChatWallpaperId;
  chatWallpaperIntensity: number;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  setChatWallpaperId: (id: ChatWallpaperId) => void;
  setChatWallpaperIntensity: (intensity: number) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  themeMode: 'dark' as ThemeMode,
  fontSize: 'medium' as FontSize,
  accentColor: 'teal' as AccentColor,
  compactMode: false,
  animations: true,
  chatWallpaperId: 'none' as ChatWallpaperId,
  chatWallpaperIntensity: DEFAULT_CHAT_WALLPAPER_INTENSITY,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setThemeMode: (mode) => {
        const effective = FORCE_DARK_THEME ? 'dark' : mode;
        set({ themeMode: effective });
        applyTheme(effective);
        if (effective === 'light' || effective === 'dark' || effective === 'full-dark') {
          useThemeStore.getState().setTheme(effective);
        }
      },
      
      setFontSize: (size) => {
        set({ fontSize: size });
        applyFontSize(size);
      },
      
      setAccentColor: (color) => {
        set({ accentColor: color });
        applyAccentColor(color);
      },
      
      setCompactMode: (compact) => {
        set({ compactMode: compact });
        applyCompactMode(compact);
      },
      
      setAnimations: (enabled) => {
        set({ animations: enabled });
        applyAnimations(enabled);
      },

      setChatWallpaperId: (id) => set({ chatWallpaperId: id }),

      setChatWallpaperIntensity: (intensity) =>
        set({ chatWallpaperIntensity: Math.min(100, Math.max(0, Math.round(intensity))) }),

      resetSettings: () => {
        set(defaultSettings);
        applyTheme(defaultSettings.themeMode);
        applyFontSize(defaultSettings.fontSize);
        applyAccentColor(defaultSettings.accentColor);
        applyCompactMode(defaultSettings.compactMode);
        applyAnimations(defaultSettings.animations);
      },
    }),
    {
      name: 'gestack-settings',
    }
  )
);

// Aplicar tema (fonte única: applyAppTheme)
function applyTheme(mode: ThemeMode) {
  applyThemeMode(mode);
  const theme = FORCE_DARK_THEME ? 'dark' : mode;
  if (theme === 'light' || theme === 'dark' || theme === 'full-dark') {
    useThemeStore.setState({ theme: theme as Theme });
  }
}

// Aplicar tamanho de fonte
function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.classList.remove('text-sm', 'text-base', 'text-lg');
  
  switch (size) {
    case 'small':
      root.style.fontSize = '14px';
      break;
    case 'large':
      root.style.fontSize = '18px';
      break;
    default:
      root.style.fontSize = '16px';
  }
}

// Aplicar cor de destaque
function applyAccentColor(color: AccentColor) {
  const root = document.documentElement;
  
  const colors = {
    teal: { h: 172, s: 94, l: 40 },
    blue: { h: 217, s: 91, l: 60 },
    purple: { h: 262, s: 83, l: 58 },
    green: { h: 142, s: 71, l: 45 },
    orange: { h: 24, s: 95, l: 53 },
    red: { h: 0, s: 84, l: 60 },
  };
  
  const { h, s, l } = colors[color];
  root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
  root.style.setProperty('--primary-foreground', '0 0% 100%');
  // Recharts / hover: mesma matiz do destaque, mais escura (barras no dark)
  const barActiveL = Math.max(l - 18, 16);
  root.style.setProperty('--chart-bar-active', `${h} ${s}% ${barActiveL}%`);
}

// Aplicar modo compacto
function applyCompactMode(compact: boolean) {
  const root = document.documentElement;
  root.classList.toggle('compact-mode', compact);
}

// Aplicar animações
function applyAnimations(enabled: boolean) {
  const root = document.documentElement;
  root.classList.toggle('reduce-motion', !enabled);
}

// Inicializar configurações ao carregar
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('gestack-settings');
  if (stored) {
    const settings = JSON.parse(stored).state;
    if (FORCE_DARK_THEME) {
      settings.themeMode = 'dark';
      syncForcedThemeStorage();
    }
    applyTheme(settings.themeMode);
    applyFontSize(settings.fontSize);
    applyAccentColor(settings.accentColor);
    applyCompactMode(settings.compactMode);
    applyAnimations(settings.animations);
  } else {
    applyTheme(defaultSettings.themeMode);
    applyFontSize(defaultSettings.fontSize);
    applyAccentColor(defaultSettings.accentColor);
    applyCompactMode(defaultSettings.compactMode);
    applyAnimations(defaultSettings.animations);
  }

  if (!FORCE_DARK_THEME) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const storedSettings = localStorage.getItem('gestack-settings');
      if (!storedSettings) return;
      try {
        const settings = JSON.parse(storedSettings).state;
        if (settings.themeMode === 'system') {
          applyTheme('system');
        }
      } catch {
        /* ignore */
      }
    });
  }
}
