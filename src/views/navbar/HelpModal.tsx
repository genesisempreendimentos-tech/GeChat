import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const HELP_FORM_URL = 'http://link.genesisempreendimentos.com.br/geapps-help';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Ajuda</DialogTitle>
          <DialogDescription className="sr-only">
            Informações sobre o GêApps, dicas de uso e contato com o suporte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Sobre o GêApps</h3>
            <p>
              O GêApps é a intranet da Gênesis, um portal central para acessar todos os aplicativos e
              ferramentas da empresa com um único login, de forma simples e organizada.
            </p>
          </section>

          <section className="space-y-3">
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
                configure suas preferências de de usabilidade do app.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">Precisa de ajuda?</h3>
            <p>
              Se tiver alguma dúvida, é só entrar em contato com o suporte pelo formulário abaixo,
              que nosso time entrará em contato.
            </p>
          </section>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0 border-t border-border pt-4 mt-2">
          <Button type="button" className="w-full sm:w-full" onClick={openSupportForm}>
            Falar com o suporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
