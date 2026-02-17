import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system' | 'full-dark';
export type FontSize = 'small' | 'medium' | 'large';
export type AccentColor = 'teal' | 'blue' | 'purple' | 'green' | 'orange' | 'red';

interface SettingsState {
  themeMode: ThemeMode;
  fontSize: FontSize;
  accentColor: AccentColor;
  compactMode: boolean;
  animations: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setFontSize: (size: FontSize) => void;
  setAccentColor: (color: AccentColor) => void;
  setCompactMode: (compact: boolean) => void;
  setAnimations: (enabled: boolean) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  themeMode: 'system' as ThemeMode,
  fontSize: 'medium' as FontSize,
  accentColor: 'teal' as AccentColor,
  compactMode: false,
  animations: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setThemeMode: (mode) => {
        set({ themeMode: mode });
        applyTheme(mode);
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

// Aplicar tema
function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove('full-dark');

  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else if (mode === 'full-dark') {
    root.classList.add('dark', 'full-dark');
  } else {
    root.classList.toggle('dark', mode === 'dark');
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
    applyTheme(settings.themeMode);
    applyFontSize(settings.fontSize);
    applyAccentColor(settings.accentColor);
    applyCompactMode(settings.compactMode);
    applyAnimations(settings.animations);
  } else {
    // Aplicar configurações padrão
    applyTheme(defaultSettings.themeMode);
    applyFontSize(defaultSettings.fontSize);
    applyAccentColor(defaultSettings.accentColor);
    applyCompactMode(defaultSettings.compactMode);
    applyAnimations(defaultSettings.animations);
  }
  
  // Listener para mudanças no tema do sistema
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const stored = localStorage.getItem('gestack-settings');
    if (stored) {
      const settings = JSON.parse(stored).state;
      if (settings.themeMode === 'system') {
        document.documentElement.classList.remove('full-dark');
        document.documentElement.classList.toggle('dark', e.matches);
      }
    }
  });
}
