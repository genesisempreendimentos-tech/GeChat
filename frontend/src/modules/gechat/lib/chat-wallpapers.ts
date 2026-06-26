export type ChatWallpaperId =
  | 'none'
  | 'genesis-simple'
  | 'flow'
  | 'nature'
  | 'oasis-ii'
  | 'solar-bellavista';

export interface ChatWallpaperOption {
  id: ChatWallpaperId;
  label: string;
  /** Nome do arquivo em /public/wallpaper */
  file: string | null;
}

export const CHAT_WALLPAPERS: ChatWallpaperOption[] = [
  { id: 'none', label: 'Nenhum', file: null },
  { id: 'genesis-simple', label: 'Genesis Simple', file: 'genesis-simple.png' },
  { id: 'flow', label: 'Flow', file: 'flow.png' },
  { id: 'nature', label: 'Nature', file: 'nature.png' },
  { id: 'oasis-ii', label: 'Oasis II', file: 'Oasis II.png' },
  { id: 'solar-bellavista', label: 'Solar Bellavista', file: 'solar-bellavista.png' },
];

export const DEFAULT_CHAT_WALLPAPER_INTENSITY = 35;

export function getChatWallpaperById(id: string | null | undefined): ChatWallpaperOption {
  return CHAT_WALLPAPERS.find((w) => w.id === id) ?? CHAT_WALLPAPERS[0];
}

export function getChatWallpaperUrl(file: string | null): string | null {
  if (!file) return null;
  return `/wallpaper/${encodeURIComponent(file)}`;
}

export function clampWallpaperIntensity(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function computeChatWallpaperLayers(
  wallpaperId: string | null | undefined,
  intensity: number,
) {
  const wallpaper = getChatWallpaperById(wallpaperId);
  const wallpaperUrl = getChatWallpaperUrl(wallpaper.file);
  const safeIntensity = clampWallpaperIntensity(intensity);
  const active = Boolean(wallpaperUrl) && safeIntensity > 0;
  const wallpaperOpacity = safeIntensity / 100;
  const scrimOpacity = active ? Math.max(0.2, 0.72 - wallpaperOpacity * 0.45) : 0;

  return {
    wallpaperUrl,
    active,
    wallpaperOpacity,
    scrimOpacity,
  };
}
