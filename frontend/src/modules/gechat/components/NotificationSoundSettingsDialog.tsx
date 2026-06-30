import { useEffect, useRef, useState } from 'react';
import { Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  NOTIFICATION_SOUNDS,
  playNotificationSoundById,
  stopCurrentPreview,
} from '@/modules/gechat/lib/notification-sounds';
import { playDefaultNotificationTone } from '@/modules/gechat/services/gechat-notifications';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

interface NotificationSoundSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSoundSettingsDialog({
  open,
  onOpenChange,
}: NotificationSoundSettingsDialogProps) {
  const savedId = useSettingsStore((s) => s.notificationSoundId);
  const setNotificationSoundId = useSettingsStore((s) => s.setNotificationSoundId);

  const [draftId, setDraftId] = useState(savedId);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const playingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      stopCurrentPreview();
      setPlayingId(null);
      return;
    }
    setDraftId(savedId);
  }, [open, savedId]);

  useEffect(() => {
    return () => {
      if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
      stopCurrentPreview();
    };
  }, []);

  const handlePlayPreview = (id: string) => {
    if (playingTimerRef.current) clearTimeout(playingTimerRef.current);
    stopCurrentPreview();
    setPlayingId(id);
    const sound = NOTIFICATION_SOUNDS.find((s) => s.id === id);
    playNotificationSoundById(id, () => {
      void playDefaultNotificationTone();
    });
    const duration = sound?.filename ? 3000 : 600;
    playingTimerRef.current = setTimeout(() => setPlayingId(null), duration);
  };

  const handleApply = () => {
    setNotificationSoundId(draftId);
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      stopCurrentPreview();
      setPlayingId(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(92vh,720px)] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-5 pr-14">
          <DialogTitle>Som de notificação</DialogTitle>
          <DialogDescription>
            Escolha o alerta que toca quando você recebe uma mensagem. Toque em reproduzir para ouvir.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,480px)] space-y-1.5 overflow-y-auto px-6 py-5">
          {NOTIFICATION_SOUNDS.map((sound) => {
            const Icon = sound.icon;
            const isSelected = draftId === sound.id;
            const isPlaying = playingId === sound.id;

            return (
              <div
                key={sound.id}
                role="button"
                tabIndex={0}
                onClick={() => setDraftId(sound.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDraftId(sound.id);
                  }
                }}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-3 transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-muted/30 hover:border-border hover:bg-muted/60',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                    isSelected
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border/60 bg-background text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-none">{sound.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{sound.description}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayPreview(sound.id);
                  }}
                  aria-label={`Ouvir ${sound.label}`}
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                    isPlaying
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary',
                  )}
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <div
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40',
                  )}
                >
                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
