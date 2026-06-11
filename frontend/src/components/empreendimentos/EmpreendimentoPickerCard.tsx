import { ChevronRight, Users } from 'lucide-react';
import { EmpreendimentoBrandIcon } from '@/components/empreendimentos/EmpreendimentoBrandIcon';
import { EmpreendimentoStatusBadge } from '@/components/empreendimentos/EmpreendimentoStatusBadge';
import { Card } from '@/components/ui/card';
import type { EmpreendimentoMetrics } from '@/lib/empreendimentosMetrics';
import { cn } from '@/lib/utils';

type EmpreendimentoPickerCardProps = {
  metric: EmpreendimentoMetrics;
  selected?: boolean;
  onSelect: () => void;
};

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function EmpreendimentoPickerCard({
  metric,
  selected = false,
  onSelect,
}: EmpreendimentoPickerCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card
        className={cn(
          'h-full transition-all duration-200 hover:border-primary/40 hover:shadow-md',
          selected && 'border-primary/50 ring-2 ring-primary/20 shadow-md',
        )}
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <EmpreendimentoBrandIcon
              pagina={metric.empreendimentoId}
              name={metric.empreendimentoNome}
              size="lg"
            />
            <ChevronRight
              className={cn(
                'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
                'group-hover:translate-x-0.5 group-hover:text-foreground',
                selected && 'text-primary',
              )}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <p className="truncate font-semibold text-foreground" title={metric.empreendimentoNome}>
              {metric.empreendimentoNome}
            </p>
            <EmpreendimentoStatusBadge status={metric.status} />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border/50 pt-3 text-sm">
            <div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Leads
              </p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                {metric.leads.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Do total</p>
              <p className="mt-0.5 font-semibold tabular-nums text-foreground">
                {formatPct(metric.percentualDoTotal)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Qualificados</p>
              <p className="mt-0.5 font-medium tabular-nums text-foreground">
                {formatPct(metric.taxaQualificacao)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vendas</p>
              <p className="mt-0.5 font-medium tabular-nums text-foreground">
                {metric.vendas.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </button>
  );
}
