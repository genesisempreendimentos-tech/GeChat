import { useState } from 'react';
import { CloudDownload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CVCRM_SYNC_STATUS_REFRESH_EVENT, cvcrmService } from '@/services/cvcrmService';

type CvcrmSyncAllDayButtonProps = {
  onSynced?: () => void;
  className?: string;
};

export function CvcrmSyncAllDayButton({ onSynced, className }: CvcrmSyncAllDayButtonProps) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await cvcrmService.syncAll();
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Erro ao baixar leads do dia no CVCRM.');
        return;
      }
      if (data?.skipped) {
        toast.info(data.message ?? 'Sincronização em andamento, aguarde.');
        return;
      }
      const processed = data?.processed ?? 0;
      const total = data?.total_baixados ?? 0;
      if (processed > 0) {
        toast.success(
          `${processed} lead${processed === 1 ? '' : 's'} atualizado${processed === 1 ? '' : 's'} (${total} baixado${total === 1 ? '' : 's'} do dia).`,
        );
        onSynced?.();
      } else if (total > 0) {
        toast.info(`${total} lead${total === 1 ? '' : 's'} no dia, sem alterações aplicáveis.`);
      } else {
        toast.info('Nenhum lead alterado hoje no CVCRM.');
      }
    } finally {
      setSyncing(false);
      window.dispatchEvent(new CustomEvent(CVCRM_SYNC_STATUS_REFRESH_EVENT));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn('rounded-xl gap-2', className)}
      disabled={syncing}
      title="Baixar todos os leads alterados hoje no CVDW (independente da fila)"
      onClick={() => void handleSync()}
    >
      <CloudDownload className={cn('h-4 w-4', syncing && 'animate-pulse')} />
      {syncing ? 'Baixando dia inteiro…' : 'Baixar tudo do dia'}
    </Button>
  );
}
