import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChatWallpaperLayers } from '@/modules/gechat/components/ChatWallpaperLayers';
import { useSettingsStore } from '@/store/settingsStore';

interface ChatWallpaperBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function ChatWallpaperBackground({ children, className }: ChatWallpaperBackgroundProps) {
  const wallpaperId = useSettingsStore((s) => s.chatWallpaperId);
  const intensity = useSettingsStore((s) => s.chatWallpaperIntensity);

  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col overflow-hidden', className)}>
      <ChatWallpaperLayers wallpaperId={wallpaperId} intensity={intensity} />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}