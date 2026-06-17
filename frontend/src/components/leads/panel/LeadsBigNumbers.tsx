import {
  Users,
  UserCheck,
  Copy,
  BookmarkCheck,
  BadgeCheck,
  HelpCircle,
} from 'lucide-react';
import type { LeadsBignumbersData } from '@/types/leadsOverview';
import { formatVendasCount } from '@/lib/vendasFormat';
import { Skeleton } from '@/components/ui/skeleton';
import { MotionReveal } from '@/components/motion/AppMotion';
import { cn } from '@/lib/utils';

type LeadsBigNumbersProps = {
  bignumbers: LeadsBignumbersData | null;
  loading?: boolean;
};

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  hero,
  loading,
  motionIndex,
}: {
  title: string;
  value: string;
  subtitle?: string;
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
            <Skeleton className="h-8 w-24" />
          ) : (
            <>
              <p className={cn('text-2xl font-bold tabular-nums tracking-tight', hero && 'text-primary')}>
                {value}
              </p>
              {subtitle ? (
                <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </MotionReveal>
  );
}

export function LeadsBigNumbers({ bignumbers, loading }: LeadsBigNumbersProps) {
  const fmt = (n: LeadsBignumbersData['leads_totais']) =>
    loading || !bignumbers
      ? '—'
      : `${formatVendasCount(n.count)} · ${n.percent}%`;

  const cards = [
    {
      title: 'Leads totais',
      value: fmt(bignumbers?.leads_totais ?? { count: 0, percent: 0 }),
      icon: <Users className="h-5 w-5" />,
      hero: true,
    },
    {
      title: 'Leads únicos',
      value: fmt(bignumbers?.leads_unicos ?? { count: 0, percent: 0 }),
      icon: <UserCheck className="h-5 w-5" />,
    },
    {
      title: 'Duplicados',
      value: fmt(bignumbers?.duplicados ?? { count: 0, percent: 0 }),
      icon: <Copy className="h-5 w-5" />,
    },
    {
      title: 'Conversão Reserva',
      value: fmt(bignumbers?.converteram_reserva ?? { count: 0, percent: 0 }),
      subtitle: '% sobre pessoas únicas',
      icon: <BookmarkCheck className="h-5 w-5" />,
    },
    {
      title: 'Conversão Venda',
      value: fmt(bignumbers?.viraram_venda ?? { count: 0, percent: 0 }),
      subtitle: '% sobre pessoas únicas',
      icon: <BadgeCheck className="h-5 w-5" />,
    },
    {
      title: 'Sem fonte',
      value: fmt(bignumbers?.sem_fonte_marketing ?? { count: 0, percent: 0 }),
      subtitle: '% sobre pessoas únicas',
      icon: <HelpCircle className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, i) => (
        <MetricCard
          key={card.title}
          {...card}
          loading={loading}
          motionIndex={i}
        />
      ))}
    </div>
  );
}
