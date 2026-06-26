import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChatWallpaperPreview } from '@/modules/gechat/components/ChatWallpaperPreview';
import {
  CHAT_WALLPAPERS,
  getChatWallpaperUrl,
  type ChatWallpaperId,
} from '@/modules/gechat/lib/chat-wallpapers';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

interface ChatWallpaperSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatWallpaperSettingsDialog({
  open,
  onOpenChange,
}: ChatWallpaperSettingsDialogProps) {
  const savedId = useSettingsStore((s) => s.chatWallpaperId);
  const savedIntensity = useSettingsStore((s) => s.chatWallpaperIntensity);
  const setChatWallpaperId = useSettingsStore((s) => s.setChatWallpaperId);
  const setChatWallpaperIntensity = useSettingsStore((s) => s.setChatWallpaperIntensity);

  const [draftId, setDraftId] = useState<ChatWallpaperId>(savedId);
  const [draftIntensity, setDraftIntensity] = useState(savedIntensity);

  useEffect(() => {
    if (!open) return;
    setDraftId(savedId);
    setDraftIntensity(savedIntensity);
  }, [open, savedId, savedIntensity]);

  const handleApply = () => {
    setChatWallpaperId(draftId);
    setChatWallpaperIntensity(draftIntensity);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92vh,760px)] max-w-4xl gap-0 overflow-hidden p-0"
        dismissOnOutsideClick={false}
      >
        <DialogHeader className="border-b border-border/60 px-6 py-5 pr-14">
          <DialogTitle>Papel de parede do chat</DialogTitle>
          <DialogDescription>
            Escolha um fundo e ajuste a intensidade. A pré-visualização mostra como ficará na conversa.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[min(68vh,560px)] grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_300px] lg:overflow-hidden">
          <div className="space-y-5 overflow-y-auto px-6 py-5 lg:max-h-[min(68vh,560px)]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CHAT_WALLPAPERS.map((wallpaper) => {
                const url = getChatWallpaperUrl(wallpaper.file);
                const selected = draftId === wallpaper.id;
                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    onClick={() => setDraftId(wallpaper.id)}
                    className={cn(
                      'relative overflow-hidden rounded-xl border-2 text-left transition-all hover:scale-[1.02]',
                      selected ? 'border-primary ring-2 ring-primary/20' : 'border-border',
                    )}
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      {url ? (
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                          Sem fundo
                        </div>
                      )}
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                    <p className="truncate px-2 py-2 text-xs font-medium">{wallpaper.label}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="wallpaper-intensity-modal" className="text-sm font-medium">
                  Intensidade
                </label>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {draftIntensity}%
                </span>
              </div>
              <input
                id="wallpaper-intensity-modal"
                type="range"
                min={0}
                max={100}
                step={1}
                value={draftIntensity}
                disabled={draftId === 'none'}
                onChange={(e) => setDraftIntensity(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed disabled:opacity-40"
              />
              <p className="text-xs text-muted-foreground">
                {draftId === 'none'
                  ? 'Selecione um papel de parede para ajustar a intensidade.'
                  : 'Valores baixos deixam o fundo mais discreto; valores altos destacam a imagem.'}
              </p>
            </div>
          </div>

          <div className="border-t border-border/60 bg-muted/15 px-6 py-5 lg:border-l lg:border-t-0">
            <ChatWallpaperPreview
              wallpaperId={draftId}
              intensity={draftId === 'none' ? 0 : draftIntensity}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleApply}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
