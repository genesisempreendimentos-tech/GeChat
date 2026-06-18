import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificacoesModal } from '@/components/historico/NotificacoesModal';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { cn } from '@/lib/utils';

type NotificacoesBellProps = {
  className?: string;
};

/** Sino desacoplado — pode ser movido para o topbar global depois. */
export function NotificacoesBell({ className }: NotificacoesBellProps) {
  const [open, setOpen] = useState(false);
  const { naoLidas, items, loading, marcarLidas, reload } = useNotificacoes(20);

  const handleOpen = async () => {
    setOpen(true);
    await reload();
    await marcarLidas();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn('relative h-10 w-10 rounded-xl', className)}
        onClick={() => void handleOpen()}
        aria-label="Notificações"
      >
        <Bell className="h-4 w-4" />
        {naoLidas > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        ) : null}
      </Button>

      <NotificacoesModal
        open={open}
        onOpenChange={setOpen}
        items={items}
        loading={loading}
        naoLidas={naoLidas}
      />
    </>
  );
}
