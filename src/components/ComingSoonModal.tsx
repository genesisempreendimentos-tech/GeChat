import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DotLottiePlayer } from '@dotlottie/react-player';
import '@dotlottie/react-player/dist/index.css';
import { AlertTriangle, ExternalLink, FlaskConical, Construction } from 'lucide-react';

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
  systemUrl?: string;
  status?: string;
}

export function ComingSoonModal({ open, onClose, systemName, systemUrl, status }: ComingSoonModalProps) {
  const [lottieKey, setLottieKey] = useState(0);
  const [lottieSrc, setLottieSrc] = useState(LOTTIES[0]);

  const isBeta = status === 'beta';

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

  const handleAccess = () => {
    if (systemUrl) window.open(systemUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogTitle className="sr-only">
          {isBeta ? 'Sistema em Beta' : 'Sistema em desenvolvimento'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isBeta ? 'Este sistema está em versão beta' : 'Este sistema ainda está sendo desenvolvido'}
        </DialogDescription>

        {isBeta ? (
          /* ── ALERTA BETA ── */
          <div className="flex flex-col items-center px-8 py-8 text-center gap-5">
            {/* Lottie clicável */}
            <button
              type="button"
              onClick={handleNext}
              className="w-24 h-24 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

            {/* Badge beta */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <FlaskConical className="w-3.5 h-3.5" />
              Versão Beta
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight">
                {systemName ? <><span className="text-primary">{systemName}</span> está em beta</> : 'Sistema em beta'}
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px] mx-auto">
                Esta versão ainda está em testes e pode conter <span className="text-amber-400 font-medium">bugs ou comportamentos inesperados</span>. Deseja acessar mesmo assim?
              </p>
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-left w-full">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Se encontrar algum problema, entre em contato com o suporte.</span>
            </div>

            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
                Cancelar
              </Button>
              <Button className="flex-1 rounded-xl gap-2" onClick={handleAccess}>
                <ExternalLink className="w-4 h-4" />
                Acessar mesmo assim
              </Button>
            </div>
          </div>
        ) : (
          /* ── EM CONSTRUÇÃO (rascunho) ── */
          <div className="flex flex-col items-center px-8 py-8 text-center gap-4">
            <button
              type="button"
              onClick={handleNext}
              className="w-24 h-24 cursor-pointer rounded-full transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border/50 text-muted-foreground text-xs font-semibold">
              <Construction className="w-3.5 h-3.5" />
              Em desenvolvimento
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold tracking-tight">Em construção!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px] mx-auto">
                {systemName ? (
                  <>O sistema <span className="font-semibold text-foreground">{systemName}</span> ainda está sendo desenvolvido com muito carinho. Em breve ele estará disponível pra você!</>
                ) : (
                  'Este sistema ainda está sendo desenvolvido com muito carinho. Em breve estará disponível!'
                )}
              </p>
            </div>

            <Button className="mt-1 rounded-full px-6" onClick={onClose}>
              Entendido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
