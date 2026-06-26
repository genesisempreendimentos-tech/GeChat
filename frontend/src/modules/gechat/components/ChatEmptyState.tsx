import { MessageSquare } from 'lucide-react';

export function ChatEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
        <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-medium text-foreground">Selecione uma conversa para começar</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Escolha uma conversa direta, grupo ou canal na lista ao lado para enviar mensagens.
        </p>
      </div>
    </div>
  );
}
