import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';
import {
  CircleOff,
  Cat,
  Dog,
  Bird,
  Mountain,
  PawPrint,
  Zap,
  Fish,
} from 'lucide-react';
import { LionIcon } from '@/components/icons/LionIcon';
import type { MascoteOption } from '../ProfileView';

function HorseHeadIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M11.5 12H11" />
      <path d="M5 15a4 4 0 0 0 4 4h7.8l.3.3a3 3 0 0 0 4-4.46L12 7c0-3-1-5-1-5S8 3 8 7c-4 1-6 3-6 3" />
      <path d="M6.14 17.8S4 19 2 22" />
    </svg>
  );
}

type MascoteOptionConfig = {
  value: MascoteOption;
  label: string;
  lottieSrc: string | null;
  StaticIcon: React.ComponentType<{ className?: string }>;
  Icon?: React.ComponentType<{ className?: string }>;
};

const MASCOTE_OPTIONS: MascoteOptionConfig[] = [
  { value: '', label: 'Nenhum', lottieSrc: null, StaticIcon: CircleOff },
  { value: 'gato', label: 'Gato', lottieSrc: '/assets/cat.lottie', StaticIcon: Cat },
  { value: 'cachorro', label: 'Cachorro', lottieSrc: '/assets/dog.lottie', StaticIcon: Dog },
  { value: 'passaro', label: 'Pássaro', lottieSrc: '/assets/bird.lottie', StaticIcon: Bird },
  { value: 'terra', label: 'Terra', lottieSrc: '/assets/terra.lottie', StaticIcon: Mountain },
  { value: 'tigre', label: 'Tigre', lottieSrc: '/assets/tigre.lottie', StaticIcon: PawPrint },
  { value: 'cavalo', label: 'Cavalo', lottieSrc: '/assets/cavalo.lottie', StaticIcon: HorseHeadIcon },
  { value: 'peixe', label: 'Peixe', lottieSrc: '/assets/peixe.lottie', StaticIcon: Fish },
  { value: 'leao', label: 'Leão', lottieSrc: '/assets/leao.lottie', StaticIcon: LionIcon },
];

interface MascotePickerButtonProps {
  value: MascoteOption;
  onChange: (value: MascoteOption) => void;
}

export function MascotePickerButton({ value, onChange }: MascotePickerButtonProps) {
  const [open, setOpen] = useState(false);
  const current = MASCOTE_OPTIONS.find((o) => o.value === value) ?? MASCOTE_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 gap-2 rounded-xl border-border/60 bg-muted/30 px-4 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center justify-center"
          aria-label="Escolher mascote"
        >
          {current.label === 'Nenhum' ? (
            <CircleOff className="h-4 w-4 shrink-0" />
          ) : current.Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <current.Icon className="h-6 w-6" />
            </span>
          ) : current.lottieSrc ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
              <DotLottiePlayer
                key={value}
                src={current.lottieSrc}
                autoplay
                loop
                className="h-full w-full"
                renderer="svg"
              />
            </span>
          ) : null}
          {current.label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px] p-4" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Escolher mascote</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {MASCOTE_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={option.value || 'none'}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex flex-col rounded-xl border overflow-hidden transition-all text-left ${
                  isSelected
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border/60 hover:bg-accent hover:border-input'
                }`}
                title={option.label}
              >
                {/* Cabeçalho do card: título + ícone estático */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/20">
                  <option.StaticIcon className="h-4 w-4 shrink-0 text-current opacity-90" />
                  <span className="text-xs font-semibold leading-tight truncate">{option.label}</span>
                </div>
                {/* Conteúdo principal do card: ícone animado */}
                <div className="flex flex-1 min-h-[72px] items-center justify-center p-3 bg-background/30">
                  {option.Icon ? (
                    <option.Icon className="h-10 w-10 text-muted-foreground" />
                  ) : option.lottieSrc ? (
                    <DotLottiePlayer
                      key={option.value}
                      src={option.lottieSrc}
                      autoplay
                      loop
                      className="h-14 w-14"
                      renderer="svg"
                    />
                  ) : (
                    <CircleOff className="h-10 w-10 text-muted-foreground/60" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
