import { Hash, MessageCircle, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ConversationCreateKind = 'direct' | 'group' | 'channel';

const OPTIONS: Array<{
  kind: ConversationCreateKind;
  title: string;
  description: string;
  icon: typeof MessageCircle;
  accent: string;
}> = [
  {
    kind: 'direct',
    title: 'Mensagem direta',
    description: 'Conversa privada com uma pessoa da equipe.',
    icon: MessageCircle,
    accent: 'from-primary/15 to-primary/5 text-primary',
  },
  {
    kind: 'group',
    title: 'Novo grupo',
    description: 'Chat em equipe com vários participantes.',
    icon: Users,
    accent: 'from-sky-500/15 to-sky-500/5 text-sky-600 dark:text-sky-400',
  },
  {
    kind: 'channel',
    title: 'Novo canal',
    description: 'Canal por setor, projeto ou avisos.',
    icon: Hash,
    accent: 'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-400',
  },
];

interface CreateConversationHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (kind: ConversationCreateKind) => void;
}

export function CreateConversationHub({ open, onOpenChange, onSelect }: CreateConversationHubProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md gap-0 p-0 overflow-hidden"
        entranceStyle="subtle"
        dismissOnOutsideClick={false}
      >
        <DialogHeader className="space-y-1 border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Escolha o tipo de conversa que deseja iniciar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 p-4">
          {OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => {
                onSelect(option.kind);
                onOpenChange(false);
              }}
              className={cn(
                'flex items-start gap-3 rounded-xl border border-border/60 p-4 text-left transition-all',
                'hover:border-primary/30 hover:bg-muted/40 hover:shadow-sm',
              )}
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
                  option.accent,
                )}
              >
                <option.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-semibold">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
