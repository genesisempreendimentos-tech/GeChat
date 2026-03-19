/** Valores da coluna `profiles.thema` no Supabase */
export type ProfileThema = 'white' | 'dark' | 'fulldark';

/** Tema aplicado na UI (themeStore / classes no `document.documentElement`) */
export type AppThemeId = 'light' | 'dark' | 'full-dark';

const PROFILE_VALUES: ProfileThema[] = ['white', 'dark', 'fulldark'];

export function isProfileThema(v: string): v is ProfileThema {
  return PROFILE_VALUES.includes(v as ProfileThema);
}

export function profileThemaToAppTheme(raw: string | null | undefined): AppThemeId {
  const t = String(raw ?? '').toLowerCase();
  if (t === 'dark') return 'dark';
  if (t === 'fulldark') return 'full-dark';
  return 'light';
}

export function appThemeToProfileThema(theme: AppThemeId): ProfileThema {
  if (theme === 'dark') return 'dark';
  if (theme === 'full-dark') return 'fulldark';
  return 'white';
}
