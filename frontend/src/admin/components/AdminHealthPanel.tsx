import { Activity, Database, Server, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRANSLUCENT_BIG_BOX } from '@/lib/translucentBigBox';
import type { AdminHealth } from '@/admin/types';

interface AdminHealthPanelProps {
  health: AdminHealth | null;
  loading?: boolean;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-xs font-semibold px-2.5 py-1 rounded-full border',
          ok
            ? 'bg-primary/15 border-primary/30 text-primary'
            : 'bg-destructive/15 border-destructive/30 text-destructive',
        )}
      >
        {ok ? 'OK' : 'Erro'}
      </span>
    </div>
  );
}

export function AdminHealthPanel({ health, loading }: AdminHealthPanelProps) {
  return (
    <div className={cn(TRANSLUCENT_BIG_BOX, 'p-4 md:p-5')}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">Saúde do sistema</h2>
      </div>

      {loading && !health ? (
        <p className="text-sm text-muted-foreground">Verificando serviços…</p>
      ) : health ? (
        <div className="divide-y divide-border/50">
          <StatusBadge ok={health.api} label="API" />
          <StatusBadge ok={health.neon} label="Banco Neon" />
          <StatusBadge ok={health.supabase} label="Supabase" />
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5" aria-hidden />
              WebSocket
            </span>
            <span className="text-sm font-medium">{health.socketConnections} conexões</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Server className="w-3.5 h-3.5" aria-hidden />
              Usuários online
            </span>
            <span className="text-sm font-medium">{health.onlineUsers}</span>
          </div>
          <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Database className="w-3.5 h-3.5" aria-hidden />
              Status geral
            </span>
            <span
              className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full border',
                health.api && health.neon && health.supabase
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-500',
              )}
            >
              {health.api && health.neon && health.supabase ? 'Operacional' : 'Degradado'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-destructive">Não foi possível verificar a saúde do sistema.</p>
      )}
    </div>
  );
}
