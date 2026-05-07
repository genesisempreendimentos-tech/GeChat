import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, LifeBuoy, Map } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

const HELP_FORM_URL = 'https://example.com/help';

export interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function openSupportForm() {
  const a = document.createElement('a');
  a.href = HELP_FORM_URL;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

/** Modal de ajuda / intranet — formulário de suporte em nova guia. */
export default function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const { setCurrentStep, setIsOnboardingActive } = useOnboardingStore();

  const handleReplayTour = () => {
    // Reinicia no passo 1 e abre o tour novamente.
    setCurrentStep(0);
    setIsOnboardingActive(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="border-b border-border/50 px-6 py-5 bg-muted/20">
          <DialogTitle className="text-xl flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-primary" />
            Ajuda
          </DialogTitle>
          <DialogDescription className="sr-only">
            Informações sobre o GeNovo, dicas de uso e contato com o suporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Sobre o GeNovo
            </h3>
            <p>
              O GeNovo é apenas um mock de interface: não há empresa real, dados reais nem suporte
              ligado a este repositório.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-border/50 bg-card/40 p-4">
            <h3 className="text-base font-semibold text-foreground">Como usar</h3>
            <ul className="list-disc pl-5 space-y-2 marker:text-primary/70">
              <li>
                <strong className="text-foreground font-semibold">Aplicativos:</strong>{' '}
                visualize todos os sistemas disponíveis para o seu perfil.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Favoritos:</strong>{' '}
                salve os aplicativos que você mais usa para acesso rápido.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Perfil:</strong>{' '}
                gerencie seus dados pessoais e acesse seus dados corporativos.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Configurações:</strong>{' '}
                configure suas preferências de usabilidade do app.
              </li>
            </ul>
          </section>

          <section className="space-y-2 rounded-xl border border-border/50 bg-card/40 p-4">
            <h3 className="text-base font-semibold text-foreground">Precisa de ajuda?</h3>
            <p>
              Se tiver alguma dúvida, é só entrar em contato com o suporte pelo formulário abaixo,
              que nosso time entrará em contato.
            </p>
          </section>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0 border-t border-border/50 px-6 py-4 bg-muted/10">
          <Button type="button" variant="outline" className="w-full sm:w-full" onClick={handleReplayTour}>
            <Map className="w-4 h-4 mr-2" />
            Rever tour
          </Button>
          <Button type="button" className="w-full sm:w-full" onClick={openSupportForm}>
            Falar com o suporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
