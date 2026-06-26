import { cn } from '@/lib/utils';
import {
  computeChatWallpaperLayers,
  type ChatWallpaperId,
} from '@/modules/gechat/lib/chat-wallpapers';

interface ChatWallpaperLayersProps {
  wallpaperId: ChatWallpaperId | string;
  intensity: number;
  className?: string;
}

export function ChatWallpaperLayers({
  wallpaperId,
  intensity,
  className,
}: ChatWallpaperLayersProps) {
  const { wallpaperUrl, active, wallpaperOpacity, scrimOpacity } = computeChatWallpaperLayers(
    wallpaperId,
    intensity,
  );

  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)} aria-hidden>
      <div className="absolute inset-0 bg-background" />
      {active && wallpaperUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${wallpaperUrl}")`,
              opacity: wallpaperOpacity,
            }}
          />
          <div
            className="absolute inset-0 bg-background"
            style={{ opacity: scrimOpacity }}
          />
        </>
      )}
    </div>
  );
}
