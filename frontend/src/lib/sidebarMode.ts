/** Valores de `public.profiles.sidebar` no Supabase */
export type SidebarMode = 'hover' | 'expanded' | 'collapsed';

const ORDER: SidebarMode[] = ['hover', 'expanded', 'collapsed'];

export function parseSidebarMode(raw: string | null | undefined): SidebarMode {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'hover' || v === 'expanded' || v === 'collapsed') return v;
  return 'hover';
}

export function isSidebarMode(v: string): v is SidebarMode {
  return ORDER.includes(v as SidebarMode);
}
