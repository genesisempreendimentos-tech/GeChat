import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react';
import { HorizontalBarRankChart } from '@/components/dados/DadosCharts';
import { TabButtons } from '@/components/ui/tab-buttons';
import {
  EMPREENDIMENTO_BAR_METRIC_OPTIONS,
  metricsToBarRankItems,
  type EmpreendimentoBarMetric,
  type EmpreendimentoMetrics,
} from '@/lib/empreendimentosMetrics';

const BAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4'];

const METRIC_TAB_ITEMS = [
  { value: 'leads' as const, label: 'Leads', Icon: Users },
  { value: 'qualificados' as const, label: 'Qualificados', Icon: CheckCircle2 },
  { value: 'atendimento' as const, label: 'Atendimento', Icon: ClipboardList },
  { value: 'visitas' as const, label: 'Visitas', Icon: MapPin },
  { value: 'vendas' as const, label: 'Vendas', Icon: ShoppingBag },
  { value: 'emAberto' as const, label: 'Em aberto', Icon: TrendingUp },
] satisfies ReadonlyArray<{
  value: EmpreendimentoBarMetric;
  label: string;
  Icon: typeof Users;
}>;

export function EmpreendimentoComparativoChart({ metrics }: { metrics: EmpreendimentoMetrics[] }) {
  const [metric, setMetric] = useState<EmpreendimentoBarMetric>('leads');

  const barData = useMemo(() => {
    const items = metricsToBarRankItems(metrics, metric);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    return items.map((item, index) => ({
      name: item.name,
      value: item.value,
      color: BAR_COLORS[index % BAR_COLORS.length]!,
      pct: total > 0 ? Math.round((item.value / total) * 1000) / 10 : 0,
    }));
  }, [metrics, metric]);

  const valueLabel =
    EMPREENDIMENTO_BAR_METRIC_OPTIONS.find((o) => o.value === metric)?.label ?? 'Leads';

  return (
    <div className="space-y-3">
      <TabButtons value={metric} items={METRIC_TAB_ITEMS} onChange={setMetric} />
      <HorizontalBarRankChart
        data={barData}
        title="Comparativo por empreendimento"
        description="Ranking visual por métrica selecionada"
        valueLabel={valueLabel}
      />
    </div>
  );
}