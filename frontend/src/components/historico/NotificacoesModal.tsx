import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadDisplayIdBadge } from '@/components/leads/LeadDisplayIdBadge';
import {
  formatHistoricoMovimentacao,
  formatHistoricoQuando,
  HISTORICO_TIPO_BADGE,
  HISTORICO_TIPO_LABELS,
} from '@/lib/historicoFormat';
import type { NotificacaoItem } from '@/types/historico';
import { cn } from '@/lib/utils';

type NotificacoesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: NotificacaoItem[];
  loading?: boolean;
  naoLidas: number;
};

export function NotificacoesModal({
  open,
  onOpenChange,
  items,
  loading,
  naoLidas,
}: NotificacoesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
          <DialogDescription>
            {naoLidas > 0
              ? `${naoLidas} não lida(s) — ao abrir, marcamos como lidas.`
              : 'Nenhuma movimentação nova desde a última visita.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'rounded-xl border p-3 text-sm',
                  item.lida
                    ? 'border-border/60 bg-card/40'
                    : 'border-primary/30 bg-primary/5',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                      HISTORICO_TIPO_BADGE[item.tipo],
                    )}
                  >
                    {HISTORICO_TIPO_LABELS[item.tipo]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatHistoricoQuando(item.ocorrido_em)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <LeadDisplayIdBadge geleadsId={item.geleads_id} />
                  {item.lead_nome ? (
                    <span className="font-medium text-foreground">{item.lead_nome}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-muted-foreground">{formatHistoricoMovimentacao(item)}</p>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem notificações recentes.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
