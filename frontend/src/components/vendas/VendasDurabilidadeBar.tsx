import type { VendasDurabilidade } from '@/types/vendas';
import { formatVendasCount, formatVendasPercent } from '@/lib/vendasFormat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { INFOBOX_TOOLTIP_CONTENT_CLASS } from '@/components/ui/infoboxes';
import { cn } from '@/lib/utils';
type VendasDurabilidadeBarProps = {
  durabilidade: VendasDurabilidade | null;
  vendasEfetuadas?: number | null;
  loading?: boolean;
};

type DurabilidadeSegmentKey = keyof Pick<
  VendasDurabilidade,
  'vendida' | 'contrato_gerado' | 'envio_sienge' | 'outros' | 'distrato' | 'cancelada'
>;

type SegmentDef = {
  key: DurabilidadeSegmentKey;
  label: string;
  cvLabel: string;
  color: string;
  group: 'ativa' | 'revertida';
  hideWhenZero?: boolean;
};

const SEGMENTS: SegmentDef[] = [
  { key: 'vendida', label: 'Consolidada', cvLabel: 'Vendida', color: 'bg-teal-600', group: 'ativa' },
  {
    key: 'contrato_gerado',
    label: 'Contrato',
    cvLabel: 'Contrato de Compra e Venda Gerado',
    color: 'bg-teal-400',
    group: 'ativa',
  },
  { key: 'envio_sienge', label: 'Sienge', cvLabel: 'Envio Sienge', color: 'bg-teal-300', group: 'ativa' },
  { key: 'outros', label: 'Outros', cvLabel: 'Outros', color: 'bg-slate-300 dark:bg-slate-500', group: 'ativa', hideWhenZero: true },
  { key: 'distrato', label: 'Distrato', cvLabel: 'Distrato', color: 'bg-amber-400', group: 'revertida' },
  { key: 'cancelada', label: 'Cancelada', cvLabel: 'Cancelada', color: 'bg-rose-400', group: 'revertida' },
];
function segmentCount(durabilidade: VendasDurabilidade | null, key: DurabilidadeSegmentKey): number {
  return durabilidade?.[key] ?? 0;
}

function LegendGroup({
  title,
  segments,
  durabilidade,
  total,
}: {
  title: string;
  segments: SegmentDef[];
  durabilidade: VendasDurabilidade | null;
  total: number;
}) {
  const items = segments.filter((seg) => {
    const count = segmentCount(durabilidade, seg.key);
    if (seg.hideWhenZero && count === 0) return false;
    return true;
  });

  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {items.map((seg) => {
          const count = segmentCount(durabilidade, seg.key);
          return (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', seg.color)} />
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                    {seg.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  collisionPadding={20}
                  className={INFOBOX_TOOLTIP_CONTENT_CLASS}
                >
                  No CV: {seg.cvLabel}
                </TooltipContent>
              </Tooltip>
              <span className="font-semibold tabular-nums text-foreground">                {formatVendasCount(count)}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                ({formatVendasPercent(count, total)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function VendasDurabilidadeBar({
  durabilidade,
  vendasEfetuadas,
  loading,
}: VendasDurabilidadeBarProps) {
  const total = vendasEfetuadas ?? durabilidade?.total_efetuadas ?? 0;

  const barSegments = SEGMENTS.map((seg) => {
    const count = segmentCount(durabilidade, seg.key);
    const pct = total > 0 ? (count / total) * 100 : 0;
    return { ...seg, count, pct };
  }).filter((seg) => {
    if (seg.hideWhenZero && seg.count === 0) return false;
    return seg.pct > 0;
  });

  const ativaSegments = SEGMENTS.filter((s) => s.group === 'ativa');
  const revertidaSegments = SEGMENTS.filter((s) => s.group === 'revertida');

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Durabilidade da venda</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Partição das vendas efetuadas pelo status atual — ativa (em curso) versus revertida
            (distrato ou cancelamento após a venda).
          </p>
          {loading ? (
            <Skeleton className="h-5 w-36 shrink-0 self-end" />
          ) : total > 0 ? (
            <p className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{formatVendasCount(total)}</span>{' '}
              vendas efetuadas
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full rounded-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : total === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sem vendas efetuadas para analisar durabilidade.
          </p>
        ) : (
          <>
            <div className="h-5 w-full overflow-hidden rounded-full bg-muted/50 ring-1 ring-border/40">
              <div className="flex h-full w-full">
                {barSegments.map((seg, index) => {
                  const isFirst = index === 0;
                  const isLast = index === barSegments.length - 1;
                  const tooltip = `${seg.label} (No CV: ${seg.cvLabel}): ${formatVendasCount(seg.count)} (${formatVendasPercent(seg.count, total)})`;
                  return (
                    <div
                      key={seg.key}
                      className={cn(
                        'h-full transition-all',
                        seg.color,
                        isFirst && 'rounded-l-full',
                        isLast && 'rounded-r-full',
                      )}
                      style={{ width: `${seg.pct}%` }}
                      title={tooltip}
                    />
                  );
                })}
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <LegendGroup
                title="Ativa"
                segments={ativaSegments}
                durabilidade={durabilidade}
                total={total}
              />
              <LegendGroup
                title="Revertida"
                segments={revertidaSegments}
                durabilidade={durabilidade}
                total={total}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
