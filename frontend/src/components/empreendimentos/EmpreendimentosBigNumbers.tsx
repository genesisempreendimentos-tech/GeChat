import {
  Building2,
  HeartHandshake,
  Link2,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
} from 'lucide-react';
import type {
  EmpreendimentosAnalyticsBignumbers,
  EmpreendimentosAnalyticsMetric,
} from '@/types/empreendimentos';
import { formatVendasCount } from '@/lib/vendasFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionReveal } from '@/components/motion/AppMotion';
import { cn } from '@/lib/utils';

type EmpreendimentosBigNumbersProps = {
  bignumbers: EmpreendimentosAnalyticsBignumbers | null;
  loading?: boolean;
};

function formatMetricValue(
  block: EmpreendimentosAnalyticsMetric | undefined,
  loading: boolean,
  hasData: boolean,
): string {
  if (loading || !hasData || !block) return '—';
  return `${formatVendasCount(block.count)} · ${block.percent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function MetricCard({
  title,
  value,
  icon,
  hero,
  loading,
  motionIndex,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  hero?: boolean;
  loading?: boolean;
  motionIndex?: number;
}) {
  return (
    <MotionReveal index={motionIndex} className="h-full">
      <div
        className={cn(
          'flex h-full flex-col justify-between rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md',
          hero ? 'border-primary/30 bg-primary/10' : 'border-border/60 bg-card/80',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium', hero ? 'text-primary' : 'text-muted-foreground')}>
            {title}
          </p>
          <div className={cn('shrink-0', hero ? 'text-primary' : 'text-muted-foreground')}>{icon}</div>
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className={cn('text-2xl font-bold tabular-nums tracking-tight', hero && 'text-primary')}>
              {value}
            </p>
          )}
        </div>
      </div>
    </MotionReveal>
  );
}

export function EmpreendimentosBigNumbers({ bignumbers, loading }: EmpreendimentosBigNumbersProps) {
  const hasData = Boolean(bignumbers);
  const fmt = (block: EmpreendimentosAnalyticsMetric | undefined) =>
    formatMetricValue(block, Boolean(loading), hasData);

  const cards = [
    {
      title: 'Pessoas únicas',
      value: fmt(bignumbers?.total_pessoas),
      icon: <Users className="h-5 w-5" />,
      hero: true,
    },
    {
      title: 'Empreendimentos',
      value: fmt(bignumbers?.com_empreendimento),
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      title: 'Tróia',
      value: fmt(bignumbers?.sem_interesse),
      icon: <UserMinus className="h-5 w-5" />,
    },
    {
      title: 'Sem empreendimento mapeado',
      value: fmt(bignumbers?.sem_empreendimento),
      icon: <UserRound className="h-5 w-5" />,
    },
    {
      title: 'Total de interesses',
      value: fmt(bignumbers?.total_interesses),
      icon: <HeartHandshake className="h-5 w-5" />,
    },
    {
      title: 'Cadastros totais',
      value: fmt(bignumbers?.total_cadastros),
      icon: <UserRound className="h-5 w-5" />,
    },
    {
      title: 'Empreendimentos ativos',
      value: fmt(bignumbers?.empreendimentos_ativos),
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      title: 'Aliases mapeados',
      value: fmt(bignumbers?.aliases_mapeados),
      icon: <Link2 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {cards.map((card, index) => (
        <MetricCard key={card.title} {...card} loading={loading} motionIndex={index} />
      ))}
    </div>
  );
}
