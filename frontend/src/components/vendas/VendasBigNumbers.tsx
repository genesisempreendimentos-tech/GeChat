import {
  HandCoins,
  Receipt,
  Ticket,
  Info,
  Layers,
  CircleX,
  TrendingDown,
  Clock,
  ShieldCheck,
  Percent,
  BadgeCheck,
  Target,
} from 'lucide-react';
import type { VendasTotais } from '@/types/vendas';
import {
  formatVendasBRL,
  formatVendasBRLShort,
  formatVendasCount,
  formatVendasPercent,
} from '@/lib/vendasFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { INFOBOX_TOOLTIP_CONTENT_CLASS } from '@/components/ui/infoboxes';
import { cn } from '@/lib/utils';
import { MotionReveal } from '@/components/motion/AppMotion';

type VendasBigNumbersProps = {
  totais: VendasTotais | null;
  loading?: boolean;
};

function MetricCard({
  title,
  value,
  valueTooltip,
  subtitle,
  infoTooltip,
  hideInfo,
  icon,
  hero,
  heroValueClassName,
  loading,
  motionIndex,
}: {
  title: string;
  value: string;
  valueTooltip?: string;
  subtitle?: string;
  infoTooltip?: string;
  hideInfo?: boolean;
  icon: React.ReactNode;
  hero?: boolean;
  heroValueClassName?: string;
  loading?: boolean;
  motionIndex?: number;
}) {
  return (
    <MotionReveal index={motionIndex} className="h-full">
      <div
        className={cn(
          'flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md',
          hero
            ? 'border-primary/30 bg-primary/10'
            : 'border-border/60 bg-card/80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <p className={cn('text-sm font-medium', hero ? 'text-primary' : 'text-muted-foreground')}>
              {title}
            </p>
            {!hideInfo && infoTooltip ? (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'inline-flex shrink-0 rounded-md p-0.5 transition-colors',
                      hero
                        ? 'text-primary/70 hover:bg-primary/15 hover:text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    )}
                    aria-label={`Informação: ${title}`}
                  >
                    <Info className="size-3.5" strokeWidth={2.25} />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  collisionPadding={20}
                  className={INFOBOX_TOOLTIP_CONTENT_CLASS}
                >
                  {infoTooltip}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
              hero ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            {icon}
          </div>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-9 w-32" />
        ) : valueTooltip ? (
          <div className="mt-2">
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <p
                  className={cn(
                    'w-fit cursor-default tabular-nums tracking-tight',
                    hero
                      ? cn('text-2xl font-bold text-primary sm:text-3xl', heroValueClassName)
                      : 'text-2xl font-semibold',
                  )}
                >
                  {value}
                </p>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                align="start"
                sideOffset={8}
                collisionPadding={20}
                className={INFOBOX_TOOLTIP_CONTENT_CLASS}
              >
                {valueTooltip}
              </TooltipContent>
            </Tooltip>
            {subtitle ? (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2">
            <p
              className={cn(
                'tabular-nums tracking-tight',
                hero
                  ? cn('text-2xl font-bold text-primary sm:text-3xl', heroValueClassName)
                  : 'text-2xl font-semibold',
              )}
            >
              {value}
            </p>
            {subtitle ? (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        )}
      </div>
    </MotionReveal>
  );
}

export function VendasBigNumbers({ totais, loading }: VendasBigNumbersProps) {
  const ticket =
    totais?.ticket_medio != null ? formatVendasBRL(totais.ticket_medio) : '—';

  const taxaVenda =
    totais && totais.reservas_totais > 0
      ? formatVendasPercent(totais.vendas_efetuadas, totais.reservas_totais)
      : '—';

  const taxaConsolidacao =
    totais && totais.vendas_efetuadas > 0
      ? formatVendasPercent(totais.durabilidade.vendida, totais.vendas_efetuadas)
      : '—';

  const aproveitamentoReal =
    totais && totais.reservas_totais > 0
      ? formatVendasPercent(totais.durabilidade.vendida, totais.reservas_totais)
      : '—';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Valor efetuado"
          value={totais ? formatVendasBRLShort(totais.valor_efetuado) : '—'}
          valueTooltip={totais ? formatVendasBRL(totais.valor_efetuado) : undefined}
          infoTooltip="Soma do valor de contrato das vendas efetuadas (reservas com data de venda), conforme os filtros aplicados."
          icon={<HandCoins className="h-4 w-4" />}
          hero
          loading={loading}
          motionIndex={0}
        />
        <MetricCard
          title="Ticket médio"
          value={ticket}
          infoTooltip="Valor médio do contrato entre as vendas efetuadas (valor efetuado ÷ quantidade de vendas)."
          icon={<Ticket className="h-4 w-4" />}
          loading={loading}
          motionIndex={1}
        />
        <MetricCard
          title="Taxa de venda"
          value={taxaVenda}
          infoTooltip="Vendas efetuadas ÷ reservas totais — proporção da carteira que chegou a vender (data de venda preenchida)."
          icon={<Percent className="h-4 w-4" />}
          loading={loading}
          motionIndex={2}
        />
        <MetricCard
          title="Taxa de consolidação"
          value={taxaConsolidacao}
          infoTooltip="Vendas consolidadas ÷ vendas efetuadas — entre as que venderam, quantas já estão com status Consolidada no CV."
          icon={<BadgeCheck className="h-4 w-4" />}
          loading={loading}
          motionIndex={3}
        />
        <MetricCard
          title="Aproveitamento real"
          value={aproveitamentoReal}
          infoTooltip="Vendas consolidadas ÷ reservas totais — da carteira inteira, quantas reservas chegaram a venda consolidada no CV."
          icon={<Target className="h-4 w-4" />}
          loading={loading}
          motionIndex={4}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Reservas totais"
          value={totais ? formatVendasCount(totais.reservas_totais) : '—'}
          infoTooltip="Todas as reservas na carteira. Soma vendas efetuadas + reservas perdidas + reservas em andamento."
          icon={<Layers className="h-4 w-4" />}
          loading={loading}
          motionIndex={5}
        />
        <MetricCard
          title="Reservas andamento"
          value={totais ? formatVendasCount(totais.reservas_andamento) : '—'}
          infoTooltip="Ainda sem data de venda e fora das perdas explícitas (Vencida/Cancelada). Inclui Nova, Análise e qualquer status futuro do CV — o restante que ainda pode virar venda."
          icon={<Clock className="h-4 w-4" />}
          loading={loading}
          motionIndex={6}
        />
        <MetricCard
          title="Reservas perdidas"
          value={totais ? formatVendasCount(totais.reservas_perdidas) : '—'}
          infoTooltip="Perdeu antes de vender: sem data de venda e situação Vencida ou Cancelada. Não chegou a fechar a venda."
          icon={<CircleX className="h-4 w-4" />}
          loading={loading}
          motionIndex={7}
        />
        <MetricCard
          title="Vendas efetuadas"
          value={totais ? formatVendasCount(totais.vendas_efetuadas) : '—'}
          infoTooltip="Chegou a vender (data de venda preenchida). Contagem durável — não diminui se depois houver distrato ou cancelamento pós-venda."
          icon={<Receipt className="h-4 w-4" />}
          loading={loading}
          motionIndex={8}
        />
        <MetricCard
          title="Vendas revertidas"
          value={totais ? formatVendasCount(totais.vendas_perdidas) : '—'}
          infoTooltip="Vendeu e depois reverteu: com data de venda e situação Distrato ou Cancelada (pós-venda). Diferente de reserva perdida, que nunca chegou a vender."
          icon={<TrendingDown className="h-4 w-4" />}
          loading={loading}
          motionIndex={9}
        />
        <MetricCard
          title="Vendas ativas"
          value={totais ? formatVendasCount(totais.vendas_ativas) : '—'}
          infoTooltip="Vendas efetuadas que ainda estão de pé: vendas efetuadas menos vendas perdidas. Catch-all — inclui Vendida, Contrato Gerado, Envio Sienge e qualquer status pós-venda futuro que não seja distrato ou cancelamento."
          icon={<ShieldCheck className="h-4 w-4" />}
          loading={loading}
          motionIndex={10}
        />
      </div>
    </div>
  );
}
