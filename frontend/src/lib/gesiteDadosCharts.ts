import type { DonutSlice } from '@/components/Charts';
import type { GesiteLeadQualificacao } from '@/rules/qualifyGesiteLead';
import { format, startOfDay, subDays } from 'date-fns';
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

const QUALIFICACAO_DONUT_COLORS: Record<GesiteLeadQualificacao, string> = {
  Alta: '#10b981',
  Média: '#8b5cf6',
  Baixa: '#f59e0b',
  Indefinida: '#94a3b8',
  'N/A': '#64748b',
};

const ORIGEM_DONUT_PALETTE = ['#14b8a6', '#6366f1', '#f59e0b', '#ec4899', '#64748b', '#22c55e', '#0ea5e9'];
const DISPOSITIVO_DONUT_PALETTE = ['#3b82f6', '#a855f7', '#06b6d4', '#84cc16'];

export function gesiteDadosTimeRangeDays(range: GesiteDadosTimeRange): number {
  return range === '7' ? 7 : range === '30' ? 30 : 90;
}

function contatoIsForm(contato: string) {
  return contato.includes('@');
}

function isConversaoLead(row: GesiteLeadMetricsRow) {
  return gesiteLeadRespondeuFormularioPerfil(row);
}

export function filterGesiteRowsInDays(rows: GesiteLeadMetricsRow[], days: number): GesiteLeadMetricsRow[] {
  const cutoff = startOfDay(subDays(new Date(), days - 1)).getTime();
  return rows.filter((row) => startOfDay(new Date(row.dataHora)).getTime() >= cutoff);
}

export function aggregateGesiteByDay(
  rows: GesiteLeadMetricsRow[],
  metric: GesiteDayMetric,
  days: number,
): { date: string; leads: number }[] {
  const range = Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return {
      date: format(d, 'dd/MM', { locale: ptBR }),
      fullDate: startOfDay(d).getTime(),
      leads: 0,
    };
  });

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

  return range.map(({ date, leads }) => ({ date, leads }));
}

function buildDonutFromCounts(
  counts: Map<string, number>,
  colorFor: (name: string, index: number) => string,
): DonutSlice[] {
  return Array.from(counts.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: colorFor(name, index),
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function gesiteByQualificacaoDonut(rows: GesiteLeadMetricsRow[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.qualificacao, (counts.get(row.qualificacao) ?? 0) + 1);
  }
  return buildDonutFromCounts(counts, (name) => QUALIFICACAO_DONUT_COLORS[name as GesiteLeadQualificacao] ?? '#94a3b8');
}

export function gesiteByOrigemDonut(rows: GesiteLeadMetricsRow[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.origem, (counts.get(row.origem) ?? 0) + 1);
  }
  return buildDonutFromCounts(counts, (_, i) => ORIGEM_DONUT_PALETTE[i % ORIGEM_DONUT_PALETTE.length] ?? '#94a3b8');
}

export function gesiteByDispositivoDonut(rows: GesiteLeadMetricsRow[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const device = row.dispositivo?.trim();
    if (device) counts.set(device, (counts.get(device) ?? 0) + 1);
  }
  return buildDonutFromCounts(
    counts,
    (_, i) => DISPOSITIVO_DONUT_PALETTE[i % DISPOSITIVO_DONUT_PALETTE.length] ?? '#94a3b8',
  );
}

function formatPaginaLabel(path: string): string {
  const slug = path.replace(/^\//, '') || 'home';
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function gesiteByPaginaDonut(rows: GesiteLeadMetricsRow[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = formatPaginaLabel(row.pagina);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return buildDonutFromCounts(counts, (_, i) => ORIGEM_DONUT_PALETTE[i % ORIGEM_DONUT_PALETTE.length] ?? '#94a3b8');
}
