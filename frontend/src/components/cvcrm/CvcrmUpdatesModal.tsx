import { useCallback, useState } from 'react';
import { History } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  cvcrmService,
  formatAuditFieldLabel,
  formatAuditValue,
  formatCvcrmUpdateSyncedAt,
  type CvcrmLeadUpdateRow,
} from '@/services/cvcrmService';

type CvcrmUpdatesModalProps = {
  className?: string;
};

function actionLabel(action: string): string {
  return action === 'insert' ? 'Criado' : 'Atualizado';
}

function UpdateRow({ row }: { row: CvcrmLeadUpdateRow }) {
  const changeEntries = Object.entries(row.changes ?? {});

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-foreground truncate">
            {row.lead_name || `Lead #${row.idlead}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {actionLabel(row.action)} em {row.source_table ?? '—'}
            {row.cvcrm_lead_id ? ` · CVCRM ${row.cvcrm_lead_id}` : ''}
          </p>
        </div>
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {formatCvcrmUpdateSyncedAt(row.synced_at)}
        </p>
      </div>

      {changeEntries.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted-foreground">
          {changeEntries.map(([field, change]) => (
            <li key={field}>
              <span className="text-foreground">{formatAuditFieldLabel(field)}:</span>{' '}
              {formatAuditValue(change.de)} → {formatAuditValue(change.para)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Sem detalhes de alteração.</p>
      )}
    </div>
  );
}

export function CvcrmUpdatesModal({ className }: CvcrmUpdatesModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<CvcrmLeadUpdateRow[]>([]);

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await cvcrmService.listUpdates(100, 0);
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Erro ao carregar atualizações.');
        return;
      }
      setUpdates(data?.updates ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      void loadUpdates();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn('rounded-xl gap-2', className)}
        title="Ver histórico de alterações aplicadas pelo sync CVCRM"
        onClick={() => handleOpenChange(true)}
      >
        <History className="h-4 w-4" />
        Visualizar atualizações
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Atualizações CVCRM</DialogTitle>
            <DialogDescription>
              Histórico do que foi alterado no Neon após cada sincronização com o CVDW.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {loading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Carregando…</p>
            ) : updates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma atualização registrada ainda.
              </p>
            ) : (
              updates.map((row) => <UpdateRow key={row.id} row={row} />)
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
