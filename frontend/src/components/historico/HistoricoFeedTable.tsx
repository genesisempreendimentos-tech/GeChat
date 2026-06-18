import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { LeadDisplayIdBadge } from '@/components/leads/LeadDisplayIdBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PageErrorState } from '@/components/common/PageStates';
import {
  formatHistoricoEmpreendimento,
  formatHistoricoMovimentacao,
  formatHistoricoQuando,
  HISTORICO_TIPO_BADGE,
  HISTORICO_TIPO_LABELS,
} from '@/lib/historicoFormat';
import type { HistoricoMovimentacao } from '@/types/historico';
import { cn } from '@/lib/utils';

type HistoricoFeedTableProps = {
  rows: HistoricoMovimentacao[];
  total: number;
  page: number;
  pages: number;
  loading?: boolean;
  error?: string | null;
  onPageChange: (page: number) => void;
  onRetry?: () => void;
};

export function HistoricoFeedTable({
  rows,
  total,
  page,
  pages,
  loading,
  error,
  onPageChange,
  onRetry,
}: HistoricoFeedTableProps) {
  if (error) {
    return <PageErrorState message={error} onRetry={onRetry} />;
  }

  if (loading) {
    return <Skeleton className="h-[420px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {total.toLocaleString('pt-BR')} movimentação(ões)
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/40 dark:bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Quando</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Tipo</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">ID</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Lead</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Empreendimento</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Movimentação</th>
                <th className="whitespace-nowrap px-4 py-3.5 font-medium">Origem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3.5 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {formatHistoricoQuando(row.ocorrido_em)}
                      {row.hora_deteccao ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                ~det
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              Hora em que o sync detectou a mudança — não necessariamente a hora real no CVCRM.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                        HISTORICO_TIPO_BADGE[row.tipo],
                      )}
                    >
                      {HISTORICO_TIPO_LABELS[row.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <LeadDisplayIdBadge geleadsId={row.geleads_id} />
                  </td>
                  <td className="px-4 py-3.5">{row.lead_nome ?? '—'}</td>
                  <td className="px-4 py-3.5">{formatHistoricoEmpreendimento(row.empreendimento_norm)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{formatHistoricoMovimentacao(row)}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{row.origem ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma movimentação encontrada com os filtros atuais.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          {page} / {pages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
