import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCheck, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import type { UserProfile } from '@/modules/gechat/types';

interface MessageReadReceiptsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  messageId: string | null;
}

type ReceiptRow = {
  userId: string;
  at: string;
  profile: UserProfile;
};

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatReceiptTime(at: string) {
  return format(new Date(at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

function ReceiptSection({
  title,
  emptyLabel,
  items,
  icon,
}: {
  title: string;
  emptyLabel: string;
  items: ReceiptRow[];
  icon: React.ReactNode;
}) {
  return (
    <section className="py-1">
      <h3 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        items.map((item) => (
          <div
            key={item.userId}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50"
          >
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={item.profile.avatar} alt="" />
              <AvatarFallback className="text-xs">{initials(item.profile.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.profile.name}</p>
              <p className="text-xs text-muted-foreground">{formatReceiptTime(item.at)}</p>
            </div>
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              {icon}
            </span>
          </div>
        ))
      )}
    </section>
  );
}

export function MessageReadReceiptsDialog({
  open,
  onOpenChange,
  conversationId,
  messageId,
}: MessageReadReceiptsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveredTo, setDeliveredTo] = useState<ReceiptRow[]>([]);
  const [readBy, setReadBy] = useState<ReceiptRow[]>([]);

  useEffect(() => {
    if (!open || !messageId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setDeliveredTo([]);
    setReadBy([]);

    gechatApi
      .getMessageReads(conversationId, messageId)
      .then((data) => {
        if (cancelled) return;
        const readIds = new Set(data.readBy.map((r) => r.userId));
        setDeliveredTo(
          data.deliveredTo
            .filter((r) => !readIds.has(r.userId))
            .map((r) => ({
              userId: r.userId,
              at: r.deliveredAt,
              profile: r.profile,
            })),
        );
        setReadBy(
          data.readBy.map((r) => ({
            userId: r.userId,
            at: r.readAt,
            profile: r.profile,
          })),
        );
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? 'Não foi possível carregar os dados.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, conversationId, messageId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0" entranceStyle="subtle">
        <DialogHeader className="border-b border-border/60 px-5 py-4 pr-12">
          <DialogTitle className="text-base">Dados da mensagem</DialogTitle>
          <DialogDescription>Quem recebeu e quem visualizou esta mensagem.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(60vh,420px)] overflow-y-auto px-2 py-2">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          )}

          {!loading && error && (
            <p className="px-3 py-8 text-center text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && (
            <>
              <ReceiptSection
                title="Recebido por"
                emptyLabel="Ninguém recebeu esta mensagem ainda."
                items={deliveredTo}
                icon={<CheckCheck className="h-4 w-4" />}
              />
              <div className="mx-3 border-t border-border/60" />
              <ReceiptSection
                title="Visualizado por"
                emptyLabel="Ninguém visualizou esta mensagem ainda."
                items={readBy}
                icon={<CheckCheck className="h-4 w-4 text-sky-500" />}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
