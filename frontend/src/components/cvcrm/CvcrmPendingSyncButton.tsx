import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cvcrmService } from '@/services/cvcrmService';

type CvcrmPendingSyncButtonProps = {
  onSynced?: () => void;
  className?: string;
};

export function CvcrmPendingSyncButton({ onSynced, className }: CvcrmPendingSyncButtonProps) {
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCount = useCallback(async () => {
    const { data, error } = await cvcrmService.getPendingCount();
    if (!error && data) {
      setPending(data.pending);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadCount();
    const intervalId = window.setInterval(() => {
      void loadCount();
    }, 30_000);
    return () => window.clearInterval(intervalId);
  }, [loadCount]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await cvcrmService.syncNow();
      if (error) {
        toast.error(typeof error === 'string' ? error : 'Erro ao sincronizar com o CVCRM.');
        return;
      }
      if (data?.skipped) {
        toast.info(data.message ?? 'Sincronização recente, aguarde.');
        return;
      }
      if (data?.message === 'Nada para atualizar' || data?.message === 'fila vazia') {
        toast.info('Nada para atualizar no CVCRM.');
        return;
      }
      const processed = data?.processed ?? 0;
      if (processed > 0) {
        toast.success(`${processed} lead(s) atualizado(s) a partir do CVCRM.`);
        onSynced?.();
      } else if ((data?.not_found ?? 0) > 0) {
        toast.warning(
          `${data?.not_found ?? 0} lead(s) ainda não encontrados na lista do dia no CVCRM.`,
        );
      } else {
        toast.info('Sincronização concluída sem alterações.');
      }
    } finally {
      setSyncing(false);
      await loadCount();
    }
  };

  const disabled = loading || syncing || pending === 0;
  const label =
    pending > 0
      ? `${pending} lead${pending === 1 ? '' : 's'} aguardando CVCRM`
      : 'CVCRM em dia';

  return (
    <Button
      type="button"
      variant={pending > 0 ? 'default' : 'outline'}
      className={cn('rounded-xl gap-2', className)}
      disabled={disabled}
      title={
        pending > 0
          ? 'Baixar atualizações do CVCRM e aplicar no Neon'
          : 'Nenhum lead aguardando atualização do CVCRM'
      }
      onClick={() => void handleSync()}
    >
      <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
      {syncing ? 'Sincronizando…' : label}
    </Button>
  );
}
