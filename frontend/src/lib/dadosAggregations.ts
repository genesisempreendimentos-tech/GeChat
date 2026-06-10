import type { LeadQualificacao } from '@/rules/qualifyLead';
import { format, getDay, getHours, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { leadRespondeuFormularioPerfil } from '@/rules/qualifyLead';
import type { LeadMetricsRow } from '@/lib/leadsMetrics';

export type DadosTimeRange = '7' | '30' | '90';

export const DADOS_TIME_RANGE_LABELS: Record<DadosTimeRange, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '3 meses',
};

export type DayMetric = 'leads' | 'forms' | 'conversoes';

export type BarRankItem = {
  name: string;
  value: number;
  color: string;
  pct: number;
};

export type DeviceStackSegment = {
  key: string;
  label: string;
  value: number;
  pct: number;
  color: string;
};

export type FunnelStep = {
  label: string;
  value: number;
  pctOfPrevious: number | null;
  pctOfFirst: number;
  color: string;
};

export type VolumePoint = {
  date: string;
  fullDate: number;
  leads: number;
};

export type ChannelSeriesPoint = {
  date: string;
  fullDate: number;
  [channel: string]: number | string;
};

export type CampaignRow = {
  origem: string;
  leads: number;
  conversoes: number;
  taxaConversaoPct: number;
  cpl: number;
  cpc: number;
};

export type HeatmapCell = {
  dayIndex: number;
  dayLabel: string;
  hour: number;
  hourLabel: string;
  value: number;
};

const QUALIFICACAO_COLORS: Record<LeadQualificacao, string> = {
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

export function dadosTimeRangeDays(range: DadosTimeRange): number {
  return range === '7' ? 7 : range === '30' ? 30 : 90;
}

function contatoIsForm(contato: string) {
  return contato.includes('@');
}

function isConversaoLead(row: LeadMetricsRow) {
  return leadRespondeuFormularioPerfil(row);
}

function isQualificadoLead(row: LeadMetricsRow) {
  return (
    leadRespondeuFormularioPerfil(row) &&
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

export function filterRowsInDays(rows: LeadMetricsRow[], days: number): LeadMetricsRow[] {
  const cutoff = startOfDay(subDays(new Date(), days - 1)).getTime();
  return rows.filter((row) => startOfDay(new Date(row.dataHora)).getTime() >= cutoff);
}

export function filterRowsInPreviousDays(
  rows: LeadMetricsRow[],
  days: number,
): LeadMetricsRow[] {
  const currentStart = startOfDay(subDays(new Date(), days - 1)).getTime();
  const previousStart = startOfDay(subDays(new Date(), days * 2 - 1)).getTime();
  return rows.filter((row) => {
    const t = startOfDay(new Date(row.dataHora)).getTime();
    return t >= previousStart && t < currentStart;
  });
}

export function aggregateByDay(
  rows: LeadMetricsRow[],
  metric: DayMetric,
  days: number,
): VolumePoint[] {
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

export function computeVolumeStats(data: VolumePoint[]) {
  const total = data.reduce((acc, p) => acc + p.leads, 0);
  const dailyAvg = data.length ? Math.round((total / data.length) * 10) / 10 : 0;
  return { total, dailyAvg };
}

function buildOrigemCatalog(names: Iterable<string>): string[] {
  const remaining = new Set(names);
  const ordered: string[] = [];
  for (const key of CHANNEL_KEYS) {
    if (remaining.has(key)) {
      ordered.push(key);
      remaining.delete(key);
    }
  }
  const rest = Array.from(remaining).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return [...ordered, ...rest];
}

export function collectOrigemCatalog(rows: LeadMetricsRow[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    if (row.origem) names.add(row.origem);
  }
  return buildOrigemCatalog(names);
}

function countsToRankItems(
  counts: Map<string, number>,
  colorFor: (name: string, index: number) => string,
  total?: number,
): BarRankItem[] {
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

export function aggregateByQualificacaoBars(rows: LeadMetricsRow[]): BarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.qualificacao, (counts.get(row.qualificacao) ?? 0) + 1);
  }
  return countsToRankItems(counts, (name) => QUALIFICACAO_COLORS[name as LeadQualificacao] ?? '#94a3b8');
}

export function aggregateByOrigemBars(
  rows: LeadMetricsRow[],
  catalog?: string[],
): BarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.origem) counts.set(row.origem, (counts.get(row.origem) ?? 0) + 1);
  }

  if (!catalog?.length) {
    return countsToRankItems(counts, origemColor);
  }

  const names = buildOrigemCatalog(catalog);
  const total = names.reduce((acc, name) => acc + (counts.get(name) ?? 0), 0);

  return names
    .map((name, index) => {
      const value = counts.get(name) ?? 0;
      return {
        name,
        value,
        color: origemColor(name, index),
        pct: total > 0 ? Math.round((value / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.value - a.value);
}

export function aggregateByPaginaBars(rows: LeadMetricsRow[]): BarRankItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = formatPaginaLabel(row.pagina);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return countsToRankItems(counts, (_, i) => ORIGEM_PALETTE[i % ORIGEM_PALETTE.length] ?? '#94a3b8');
}

export function aggregateDeviceStack100(rows: LeadMetricsRow[]): DeviceStackSegment[] {
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

export function buildConversionFunnel(rows: LeadMetricsRow[]): FunnelStep[] {
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

export function aggregateChannelSeriesOverTime(
  rows: LeadMetricsRow[],
  days: number,
): { data: ChannelSeriesPoint[]; channels: string[] } {
  const range = buildDayRange(days);

  let channels: string[] = CHANNEL_KEYS.filter((c) => rows.some((r) => r.origem === c));
  if (channels.length === 0) {
    channels = aggregateByOrigemBars(rows)
      .slice(0, 5)
      .map((b) => b.name);
  }

  const data: ChannelSeriesPoint[] = range.map((r) => {
    const point: ChannelSeriesPoint = { date: r.date, fullDate: r.fullDate };
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

export function aggregateCampaignPerformance(rows: LeadMetricsRow[]): CampaignRow[] {
  const byOrigem = new Map<string, LeadMetricsRow[]>();
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

export function buildLeadHeatmap(rows: LeadMetricsRow[]): HeatmapCell[] {
  const grid = new Map<string, number>();

  for (const row of rows) {
    const d = new Date(row.dataHora);
    if (Number.isNaN(d.getTime())) continue;
    const dayIndex = getDay(d);
    const hour = getHours(d);
    const key = `${dayIndex}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }

  const cells: HeatmapCell[] = [];
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

export function channelLineColor(channel: string, index: number): string {
  return origemColor(channel, index);
}

/** @deprecated Use aggregateByQualificacaoBars */
export function byQualificacaoDonut(rows: LeadMetricsRow[]) {
  return aggregateByQualificacaoBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}

/** @deprecated Use aggregateByOrigemBars */
export function byOrigemDonut(rows: LeadMetricsRow[]) {
  return aggregateByOrigemBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}

/** @deprecated Use aggregateDeviceStack100 */
export function byDispositivoDonut(rows: LeadMetricsRow[]) {
  return aggregateDeviceStack100(rows).map(({ label, value, color }) => ({ name: label, value, color }));
}

/** @deprecated Use aggregateByPaginaBars */
export function byPaginaDonut(rows: LeadMetricsRow[]) {
  return aggregateByPaginaBars(rows).map(({ name, value, color }) => ({ name, value, color }));
}
