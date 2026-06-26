import { CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatWallpaperLayers } from '@/modules/gechat/components/ChatWallpaperLayers';
import type { ChatWallpaperId } from '@/modules/gechat/lib/chat-wallpapers';
import { cn } from '@/lib/utils';

interface ChatWallpaperPreviewProps {
  wallpaperId: ChatWallpaperId | string;
  intensity: number;
  className?: string;
}

export function ChatWallpaperPreview({
  wallpaperId,
  intensity,
  className,
}: ChatWallpaperPreviewProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Pré-visualização</p>
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background shadow-lg">
        <div className="relative flex h-[340px] flex-col">
          <ChatWallpaperLayers wallpaperId={wallpaperId} intensity={intensity} />

          <header className="relative z-[1] flex shrink-0 items-center gap-2 border-b border-border/50 bg-background/40 px-3 py-2 backdrop-blur-sm">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-[10px]">GE</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">Equipe Genesis</p>
              <p className="text-[10px] text-muted-foreground">Grupo · 12 membros</p>
            </div>
          </header>

          <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden p-3">
            <div className="flex gap-2">
              <Avatar className="mt-1 h-6 w-6 shrink-0">
                <AvatarFallback className="text-[9px]">SR</AvatarFallback>
              </Avatar>
              <div className="max-w-[78%] rounded-2xl bg-muted px-2.5 py-2 text-[11px] leading-snug shadow-sm">
                <p className="mb-0.5 text-[9px] font-medium opacity-70">Sanjay</p>
                Olá! Como está o projeto?
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[78%] rounded-2xl bg-primary px-2.5 py-2 text-[11px] leading-snug text-primary-foreground shadow-sm">
                Tudo certo por aqui 👍
                <div className="mt-1 flex items-center justify-end gap-1 text-[9px] opacity-70">
                  <span>15:17</span>
                  <CheckCheck className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-[1] shrink-0 border-t border-border/50 bg-background/50 px-3 py-2 backdrop-blur-sm">
            <div className="h-8 rounded-full border border-border/60 bg-muted/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
