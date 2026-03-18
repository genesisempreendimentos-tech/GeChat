import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';

const LOTTIES = [
  '/assets/terra.lottie',
  '/assets/cat.lottie',
  '/assets/dog.lottie',
  '/assets/bird.lottie',
  '/assets/peixe.lottie',
  '/assets/cavalo.lottie',
  '/assets/leao.lottie',
  '/assets/tigre.lottie',
];

function pickRandom(current: string): string {
  const pool = LOTTIES.filter((l) => l !== current);
  return pool[Math.floor(Math.random() * pool.length)];
}

interface ComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  systemName?: string;
}

export function ComingSoonModal({ open, onClose, systemName }: ComingSoonModalProps) {
  const [lottieKey, setLottieKey] = useState(0);
  const [lottieSrc, setLottieSrc] = useState(LOTTIES[0]);

  // reset ao abrir
  useEffect(() => {
    if (open) {
      setLottieSrc(LOTTIES[Math.floor(Math.random() * LOTTIES.length)]);
      setLottieKey((k) => k + 1);
    }
  }, [open]);

  const handleNext = () => {
    setLottieSrc((prev) => pickRandom(prev));
    setLottieKey((k) => k + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogTitle className="sr-only">Sistema em desenvolvimento</DialogTitle>
        <DialogDescription className="sr-only">Este sistema ainda está sendo desenvolvido</DialogDescription>
        <div className="flex flex-col items-center px-8 py-10 text-center gap-4">
          <button
            type="button"
            onClick={handleNext}
            className="w-28 h-28 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title="Trocar mascote"
          >
            <DotLottiePlayer
              key={lottieKey}
              src={lottieSrc}
              autoplay
              loop
              className="w-full h-full pointer-events-none"
              renderer="svg"
            />
          </button>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight">Em construção!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px] mx-auto">
              {systemName ? (
                <>
                  O sistema <span className="font-semibold text-foreground">{systemName}</span> ainda está sendo desenvolvido com muito carinho. Em breve ele estará disponível pra você!
                </>
              ) : (
                'Este sistema ainda está sendo desenvolvido com muito carinho. Em breve estará disponível!'
              )}
            </p>
          </div>
          <Button className="mt-2 rounded-full px-6" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
