import { useGeChatStore } from '@/store/gechatStore';

export function ConnectionBanner() {
  const status = useGeChatStore((s) => s.connectionStatus);

  if (status === 'connected') return null;

  const labels = {
    connecting: 'Conectando...',
    disconnected: 'Desconectado. Reconectando...',
    error: 'Erro de conexão. Tentando novamente...',
  };

  return (
    <div className="bg-muted/80 px-3 py-1.5 text-center text-xs text-muted-foreground">
      {labels[status] ?? status}
    </div>
  );
}
