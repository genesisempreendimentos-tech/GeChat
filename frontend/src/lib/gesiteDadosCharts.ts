import type { GesiteLeadQualificacao } from '@/rules/qualifyGesiteLead';
import { format, getDay, getHours, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { gesiteLeadRespondeuFormularioPerfil } from '@/rules/qualifyGesiteLead';
import type { GesiteLeadMetricsRow } from '@/lib/gesiteLeadsMetrics';

export type GesiteDadosTimeRange = '7' | '30' | '90';

export const GESITE_DADOS_TIME_RANGE_LABELS: Record<GesiteDadosTimeRange, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '3 meses',
};

export type GesiteDayMetric = 'leads' | 'forms' | 'conversoes';

export type GesiteBarRankItem = {
  name: string;
  value: number;
  color: string;
  pct: number;
};

export type GesiteDeviceStackSegment = {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
};

export type GesiteFunnelStep = {
  label: string;
  value: number;
  pctOfPrevious: number | null;
  pctOfFirst: number;
  color: string;
};

export type GesiteVolumePoint = {
  date: string;
  fullDate: number;
  leads: number;
};

export type GesiteChannelSeriesPoint = {
  date: string;
  fullDate: number;
  [channel: string]: number | string;
};

export type GesiteCampaignRow = {
  origem: string;
  leads: number;
  conversoes: number;
  taxaConversaoPct: number;
  cpl: number;
  cpc: number;
};

export type GesiteHeatmapCell = {
  dayIndex: number;
  dayLabel: string;
  hour: number;
  hourLabel: string;
  value: number;
};

const QUALIFICACAO_COLORS: Record<GesiteLeadQualificacao, string> = {
  Alta: '#10b981',
  Média: '#8b5cf6',
  Baixa: '#f59e0b',
  Indefinida: '#94a3b8',
  'N/A': '#64748b',
};

const ORIGEM_COLORS: Record<string, string> = {
  Google: '#4285F4',
  Instagram: '#E1306C',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
  Direto: '#64748b',
};

const ORIGEM_PALETTE = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#64748b', '#22c55e', '#0ea5e9'];

const DEVICE_COLORS: Record<string, string> = {
  Desktop: '#3b82f6',
  Mobile: '#a855f7',
  Tablet: '#06b6d4',
};

const CHANNEL_KEYS = ['Google', 'Instagram', 'Facebook', 'LinkedIn', 'Direto'] as const;

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CAMPAIGN_MOCK_COST: Record<string, { cpl: number; cpc: number }> = {
  Google: { cpl: 28.5, cpc: 2.4 },
  Instagram: { cpl: 19.2, cpc: 1.1 },
  Facebook: { cpl: 22.8, cpc: 1.6 },
  LinkedIn: { cpl: 41.0, cpc: 3.2 },
  Direto: { cpl: 0, cpc: 0 },
};

export function gesiteDadosTimeRangeDays(range: GesiteDadosTimeRange): number {
  return range === '7' ? 7 : range === '30' ? 30 : 90;
}

function contatoIsForm(contato: string) {
  return contato.includes('@');
}

function isConversaoLead(row: GesiteLeadMetricsRow) {
  return gesiteLeadRespondeuFormularioPerfil(row);
}

function isQualificadoLead(row: GesiteLeadMetricsRow) {
  return (
    gesiteLeadRespondeuFormularioPerfil(row) &&
    (row.qualificacao === 'Alta' || row.qualificacao === 'Média')
  );
}

function origemColor(name: string, index: number): string {
  return ORIGEM_COLORS[name] ?? ORIGEM_PALETTE[index % ORIGEM_PALETTE.length] ?? '#94a3b8';
}

function formatPaginaLabel(path: string): string {
  const slug = path.replace(/^\//, '') || 'home';
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeDevice(raw: string): keyof typeof DEVICE_COLORS {
  const d = raw.trim().toLowerCase();
  if (d.includes('tablet')) return 'Tablet';
  if (d.includes('celular') || d.includes('mobile')) return 'Mobile';
  if (d.includes('computador') || d.includes('desktop')) return 'Desktop';
  return 'Mobile';
}

function buildDayRange(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return {
      date: format(d, 'dd/MM', { locale: ptBR }),
      fullDate: startOfDay(d).getTime(),
      leads: 0,
    };
  });
}

export function filterGesiteRowsInDays(rows: GesiteLeadMetricsRow[], days: number): GesiteLeadMetricsRow[] {
  const cutoff = startOfDay(subDays(new Date(), days - 1)).getTime();
  return rows.filter((row) => startOfDay(new Date(row.dataHora)).getTime() >= cutoff);
}

export function filterGesiteRowsInPreviousDays(
  rows: GesiteLeadMetricsRow[],
  days: number,
): GesiteLeadMetricsRow[] {
  const currentStart = startOfDay(subDays(new Date(), days - 1)).getTime();
  const previousStart = startOfDay(subDays(new Date(), days * 2 - 1)).getTime();
  return rows.filter((row) => {
    const t = startOfDay(new Date(row.dataHora)).getTime();
    return t >= previousStart && t < currentStart;
  });
}

export function aggregateGesiteByDay(
  rows: GesiteLeadMetricsRow[],
  metric: GesiteDayMetric,
  days: number,
): GesiteVolumePoint[] {
  const range = buildDayRange(days);

  for (const row of rows) {
    const t = startOfDay(new Date(row.dataHora)).getTime();
    const bucket = range.find((r) => r.fullDate === t);
    if (!bucket) continue;

    const matches =
      metric === 'leads'
        ? true
        : metric === 'forms'
          ? contatoIsForm(row.contato)
          : isConversaoLead(row);

    if (matches) bucket.leads += 1;
  }

  return range;
}

export function computeVolumeStats(data: GesiteVolumePoint[]) {
  const total = data.reduce((acc, p) => acc + p.leads, 0);
  const dailyAvg = data.length ? Math.round((total / data.length) * 10) / 10 : 0;
  return { total, dailyAvg };
}

function countsToRankItems(
  counts: Map<string, number>,
  colorFor: (name: string, index: number) => string,
  total?: number,
): GesiteBarRankItem[] {
  const sum = total ?? Array.from(counts.values()).reduce((a, b) => a + b, 0);
  return Array.from(counts.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: colorFor(name, index),
      pct: sum > 0 ? Math.round((value / sum) * 1000) / 10 : 0,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function gesiteByQualificacaoBars(rows: GesiteLeadMetricsRow[]): GesiteBarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.qualificacao, (counts.get(row.qualificacao) ?? 0) + 1);
  }
  return countsToRankItems(counts, (name) => QUALIFICACAO_COLORS[name as GesiteLeadQualificacao] ?? '#94a3b8');
}

export function gesiteByOrigemBars(rows: GesiteLeadMetricsRow[]): GesiteBarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.origem, (counts.get(row.origem) ?? 0) + 1);
  }
  return countsToRankItems(counts, origemColor);
}

export function gesiteByPaginaBars(rows: GesiteLeadMetricsRow[]): GesiteBarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = formatPaginaLabel(row.pagina);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return countsToRankItems(counts, (_, i) => ORIGEM_PALETTE[i % ORIGEM_PALETTE.length] ?? '#94a3b8');
}

export function gesiteDeviceStack100(rows: GesiteLeadMetricsRow[]): GesiteDeviceStackSegment[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const device = row.dispositivo?.trim();
    if (!device) continue;
    const key = normalizeDevice(device);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const order: Array<keyof typeof DEVICE_COLORS> = ['Desktop', 'Mobile', 'Tablet'];

  return order
    .map((key) => {
      const value = counts.get(key) ?? 0;
      return {
        key,
        label: key,
        value,
        pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
        color: DEVICE_COLORS[key],
      };
    })
    .filter((s) => s.value > 0);
}

export function gesiteConversionFunnel(rows: GesiteLeadMetricsRow[]): GesiteFunnelStep[] {
  const leads = rows.length;
  const forms = rows.filter((r) => contatoIsForm(r.contato)).length;
  const qualificados = rows.filter(isQualificadoLead).length;
  const conversoes = rows.filter(isConversaoLead).length;
  const visitantes = Math.max(leads, Math.round(leads * 4.2));

  const steps = [
    { label: 'Visitantes', value: visitantes, color: '#64748b' },
    { label: 'Leads', value: leads, color: '#14b8a6' },
    { label: 'Formulários', value: forms, color: '#6366f1' },
    { label: 'Conversões', value: conversoes, color: '#10b981' },
    { label: 'Leads Qualificados', value: qualificados, color: '#8b5cf6' },
  ];

  return steps.map((step, index) => {
    const prev = index > 0 ? steps[index - 1]!.value : null;
    return {
      label: step.label,
      value: step.value,
      pctOfPrevious: prev && prev > 0 ? Math.round((step.value / prev) * 1000) / 10 : null,
      pctOfFirst: visitantes > 0 ? Math.round((step.value / visitantes) * 1000) / 10 : 0,
      color: step.color,
    };
  });
}

export function gesiteChannelSeriesOverTime(
  rows: GesiteLeadMetricsRow[],
  days: number,
): { data: GesiteChannelSeriesPoint[]; channels: string[] } {
  const range = buildDayRange(days);

  let channels: string[] = CHANNEL_KEYS.filter((c) => rows.some((r) => r.origem === c));
  if (channels.length === 0) {
    channels = gesiteByOrigemBars(rows)
      .slice(0, 5)
      .map((b) => b.name);
  }

  const data: GesiteChannelSeriesPoint[] = range.map((r) => {
    const point: GesiteChannelSeriesPoint = { date: r.date, fullDate: r.fullDate };
    for (const ch of channels) point[ch] = 0;
    return point;
  });

  for (const row of rows) {
    const t = startOfDay(new Date(row.dataHora)).getTime();
    const bucket = data.find((r) => r.fullDate === t);
    if (!bucket) continue;
    const ch = row.origem;
    if (typeof bucket[ch] === 'number') {
      bucket[ch] = (bucket[ch] as number) + 1;
    }
  }

  return { data, channels: [...channels] };
}

export function gesiteCampaignPerformance(rows: GesiteLeadMetricsRow[]): GesiteCampaignRow[] {
  const byOrigem = new Map<string, GesiteLeadMetricsRow[]>();
  for (const row of rows) {
    const bucket = byOrigem.get(row.origem) ?? [];
    bucket.push(row);
    byOrigem.set(row.origem, bucket);
  }

  return Array.from(byOrigem.entries())
    .map(([origem, group]) => {
      const leads = group.length;
      const conversoes = group.filter(isConversaoLead).length;
      const taxaConversaoPct = leads > 0 ? Math.round((conversoes / leads) * 1000) / 10 : 0;
      const costs = CAMPAIGN_MOCK_COST[origem] ?? {
        cpl: Math.round(15 + (origem.length % 7) * 4.2),
        cpc: Math.round((0.9 + (origem.length % 5) * 0.35) * 10) / 10,
      };
      return {
        origem,
        leads,
        conversoes,
        taxaConversaoPct,
        cpl: costs.cpl,
        cpc: costs.cpc,
      };
    })
    .sort((a, b) => b.conversoes - a.conversoes || b.leads - a.leads);
}

export function gesiteLeadHeatmap(rows: GesiteLeadMetricsRow[]): GesiteHeatmapCell[] {
  const grid = new Map<string, number>();

  for (const row of rows) {
    const d = new Date(row.dataHora);
    if (Number.isNaN(d.getTime())) continue;
    const dayIndex = getDay(d);
    const hour = getHours(d);
    const key = `${dayIndex}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const cells: GesiteHeatmapCell[] = [];
  for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
    for (let hour = 8; hour <= 20; hour++) {
      cells.push({
        dayIndex,
        dayLabel: DAY_LABELS[dayIndex] ?? '',
        hour,
        hourLabel: `${String(hour).padStart(2, '0')}h`,
        value: grid.get(`${dayIndex}-${hour}`) ?? 0,
      });
    }
  }
  for (let hour = 8; hour <= 20; hour++) {
    cells.push({
      dayIndex: 0,
      dayLabel: DAY_LABELS[0] ?? '',
      hour,
      hourLabel: `${String(hour).padStart(2, '0')}h`,
      value: grid.get(`0-${hour}`) ?? 0,
    });
  }

  return cells;
}

export function gesiteChannelLineColor(channel: string, index: number): string {
  return origemColor(channel, index);
}

/** @deprecated Use gesiteByQualificacaoBars */
export function gesiteByQualificacaoDonut(rows: GesiteLeadMetricsRow[]) {
  return gesiteByQualificacaoBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}

/** @deprecated Use gesiteByOrigemBars */
export function gesiteByOrigemDonut(rows: GesiteLeadMetricsRow[]) {
  return gesiteByOrigemBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}

/** @deprecated Use gesiteDeviceStack100 */
export function gesiteByDispositivoDonut(rows: GesiteLeadMetricsRow[]) {
  return gesiteDeviceStack100(rows).map(({ label, value, color }) => ({ name: label, value, color }));
}

/** @deprecated Use gesiteByPaginaBars */
export function gesiteByPaginaDonut(rows: GesiteLeadMetricsRow[]) {
  return gesiteByPaginaBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}
