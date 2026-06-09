import type { DonutSlice } from '@/components/Charts';
import type { Lead, LeadStatus } from '@/types/lead';
import { LEAD_STATUS_LABELS } from '@/types/lead';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DashboardTimeRange = '7' | '30' | '90';

export const DASHBOARD_TIME_RANGE_LABELS: Record<DashboardTimeRange, string> = {
  '7': '7 dias',
  '30': '30 dias',
  '90': '3 meses',
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  google_ads: 'Google Ads',
  indicacao: 'Indicação',
  evento: 'Evento',
  direto: 'Direto',
  facebook_ads: 'Facebook Ads',
  webinar: 'Webinar',
};

const STATUS_DONUT_COLORS: Record<LeadStatus, string> = {
  novo: '#3b82f6',
  contato: '#f59e0b',
  qualificado: '#8b5cf6',
  negociacao: '#f97316',
  ganho: '#10b981',
  perdido: '#ef4444',
};

const SOURCE_DONUT_COLORS: Record<string, string> = {
  LinkedIn: '#14b8a6',
  'Google Ads': '#6366f1',
  Indicação: '#f59e0b',
  Evento: '#ec4899',
  Direto: '#64748b',
  'Facebook Ads': '#22c55e',
  Webinar: '#0ea5e9',
};

export function dashboardTimeRangeDays(range: DashboardTimeRange): number {
  return range === '7' ? 7 : range === '30' ? 30 : 90;
}

export function filterLeadsInRange(leads: Lead[], days: number): Lead[] {
  const cutoff = startOfDay(subDays(new Date(), days - 1)).getTime();
  return leads.filter((lead) => startOfDay(new Date(lead.createdAt)).getTime() >= cutoff);
}

export function aggregateLeadsByDay(
  leads: Lead[],
  days: number,
): { date: string; leads: number }[] {
  const range = Array.from({ length: days }, (_, i) => {
    const d = subDays(new Date(), days - 1 - i);
    return {
      date: format(d, days > 30 ? 'dd/MM' : 'dd/MM', { locale: ptBR }),
      fullDate: startOfDay(d).getTime(),
      leads: 0,
    };
  });

  for (const lead of leads) {
    const t = startOfDay(new Date(lead.createdAt)).getTime();
    const row = range.find((r) => r.fullDate === t);
    if (row) row.leads += 1;
  }

  return range.map(({ date, leads: count }) => ({ date, leads: count }));
}

export function leadsByStatusDonut(leads: Lead[]): DonutSlice[] {
  const counts = new Map<LeadStatus, number>();
  for (const lead of leads) {
    counts.set(lead.status, (counts.get(lead.status) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([status, value]) => ({
      name: LEAD_STATUS_LABELS[status],
      value,
      color: STATUS_DONUT_COLORS[status],
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function leadsBySourceDonut(leads: Lead[]): DonutSlice[] {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const label = LEAD_SOURCE_LABELS[lead.source] ?? lead.source;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      value,
      color: SOURCE_DONUT_COLORS[name] ?? '#94a3b8',
    }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
}
