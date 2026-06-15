import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CVCRM_SYNC_STATUS_REFRESH_EVENT, cvcrmService } from '@/services/cvcrmService';

type CvcrmPendingSyncButtonProps = {
  onSynced?: () => void;
  className?: string;
};

export function CvcrmPendingSyncButton({ onSynced, className }: CvcrmPendingSyncButtonProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await cvcrmService.syncIncremental();
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Erro ao sincronizar com o CVCRM.');
        return;
      }
      if (data?.skipped) {
        toast.info(data.message ?? 'Sincronização recente, aguarde.');
        return;
      }
      const processed = data?.processed ?? 0;
      const reservas = data?.reservas_processed ?? 0;
      if (processed > 0 || reservas > 0) {
        toast.success(
          `${processed} lead(s) e ${reservas} reserva(s) sincronizado(s) a partir do CVCRM.`,
        );
        onSynced?.();
      } else {
        toast.info('Sincronização concluída — nada novo desde a última rodada.');
      }
    } finally {
      setSyncing(false);
      window.dispatchEvent(new CustomEvent(CVCRM_SYNC_STATUS_REFRESH_EVENT));
    }
  }, [onSynced]);

  return (
    <Button
      type="button"
      variant="outline"
      className={cn('rounded-xl gap-2', className)}
      disabled={syncing}
      title="Baixar alterações do CVCRM desde a última sincronização"
      onClick={() => void handleSync()}
    >
      <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
      {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
    </Button>
  );
}
