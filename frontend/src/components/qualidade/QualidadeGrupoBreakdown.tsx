import type { QualidadeBreakdownRow } from '@/lib/dadosMaturacao';
import { rowTaxaQualificacao, rowTotal } from '@/lib/qualidadeMetrics';
import { cn } from '@/lib/utils';

type QualidadeGrupoBreakdownProps = {
  rows: QualidadeBreakdownRow[];
  title: string;
  description: string;
  emptyMessage?: string;
};

function formatPct(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function QualidadeGrupoBar({ row }: { row: QualidadeBreakdownRow }) {
  const total = rowTotal(row);
  if (!total) return null;

  const segments = [
    { key: 'alta', value: row.alta, color: 'bg-emerald-500', label: 'Alta' },
    { key: 'media', value: row.media, color: 'bg-blue-500', label: 'Média' },
    { key: 'baixa', value: row.baixa, color: 'bg-amber-500', label: 'Baixa' },
    { key: 'indefinida', value: row.indefinida, color: 'bg-slate-400', label: 'Indef.' },
  ].filter((segment) => segment.value > 0);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground" title={row.grupo}>
            {row.grupo}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total.toLocaleString('pt-BR')} leads · {formatPct(rowTaxaQualificacao(row))} qualificados
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Alta {row.alta}</span>
          <span>Média {row.media}</span>
          <span>Baixa {row.baixa}</span>
          <span>Indef. {row.indefinida}</span>
        </div>
      </div>

      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-muted/60">
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn('h-full', segment.color)}
            style={{ width: `${(segment.value / total) * 100}%` }}
            title={`${segment.label}: ${segment.value}`}
          />
        ))}
      </div>
    </div>
  );
}

export function QualidadeGrupoBreakdown({
  rows,
  title,
  description,
  emptyMessage = 'Nenhum dado disponível.',
}: QualidadeGrupoBreakdownProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      {!rows.length ? (
        <p className="rounded-xl border border-border/70 bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <QualidadeGrupoBar key={row.grupo} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
