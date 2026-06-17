import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LeadsOverviewResponse, LeadsPeriodoPreset } from '@/types/leadsOverview';
import { timelineSeriesColor } from '@/lib/leadsPanelColors';

export type LeadsTimelineViewMode = 'compacto' | 'detalhado';

export type LeadsTimelineSeries = {
  dataKey: string;
  name: string;
  color: string;
};

export type LeadsDayRange = {
  first: string;
  last: string;
};

export type LeadsTimelinePoint = Record<string, string | number>;

export type LeadsTimelineSlice = {
  data: LeadsTimelinePoint[];
  xKey: string;
  series: LeadsTimelineSeries[];
  formatTooltipLabel: (raw: unknown) => string;
  yTickFormatter: (value: number) => string;
  tooltipValueFormatter: (value: number) => string;
  spanDays: number;
  contactCount: number;
};

type ApiTimeline = LeadsOverviewResponse['timeline'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function slugSeriesKey(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return slug ? `emp_${slug}` : 'emp_nao_informado';
}

export function normalizeTimelineSeries(
  series: string[] | { dataKey: string; name: string }[],
): LeadsTimelineSeries[] {
  return series.map((item, index) => {
    if (typeof item === 'string') {
      return {
        dataKey: slugSeriesKey(item),
        name: item,
        color: timelineSeriesColor(index),
      };
    }
    return {
      dataKey: item.dataKey,
      name: item.name,
      color: timelineSeriesColor(index),
    };
  });
}

export function remapTimelinePoints(
  points: Record<string, string | number>[],
  series: LeadsTimelineSeries[],
  legacySeries?: string[],
): LeadsTimelinePoint[] {
  const legacy = legacySeries ?? series.map((s) => s.name);
  return points.map((point) => {
    const next: LeadsTimelinePoint = {
      dia: String(point.dia ?? ''),
      label: String(point.dia ?? ''),
    };
    series.forEach((serie, index) => {
      const legacyKey = legacy[index];
      const value = point[serie.dataKey] ?? point[legacyKey] ?? point[serie.name] ?? 0;
      next[serie.dataKey] = typeof value === 'number' ? value : Number(value) || 0;
    });
    return next;
  });
}

export function inclusiveSpanDays(first: string, last: string): number {
  const start = parseISO(first);
  const end = parseISO(last);
  return differenceInCalendarDays(end, start) + 1;
}

export function resolveLeadsContactPointCount(
  spanDays: number,
  viewMode: LeadsTimelineViewMode,
): number {
  if (viewMode === 'compacto') {
    if (spanDays <= 7) return Math.max(7, spanDays);
    return clamp(Math.round(spanDays / 14), 3, 10);
  }
  if (spanDays <= 7) return Math.max(7, spanDays);
  return clamp(Math.round(spanDays / 2), 15, 50);
}

export function formatLeadsTimelineDisplayLabel(
  spanDays: number,
  viewMode: LeadsTimelineViewMode,
  isoDate: string,
): string {
  const date = parseISO(isoDate);
  if (viewMode === 'detalhado') {
    if (spanDays <= 7) return format(date, 'dd/MM/yy HH:mm', { locale: ptBR });
    return format(date, 'dd/MM', { locale: ptBR });
  }
  if (spanDays <= 7) return format(date, 'dd/MM/yy HH:mm', { locale: ptBR });
  if (spanDays <= 150) return format(date, 'dd/MM/yy', { locale: ptBR });
  if (spanDays <= 1080) return format(date, 'MMM', { locale: ptBR });
  return format(date, 'MMM yy', { locale: ptBR });
}

export function inferDayRangeFromPoints(points: LeadsTimelinePoint[]): LeadsDayRange | null {
  const days = points.map((p) => String(p.dia ?? '')).filter(Boolean).sort();
  if (!days.length) return null;
  return { first: days[0], last: days[days.length - 1] };
}

export function resolveLeadsDisplayedDayRange(
  periodo: LeadsPeriodoPreset,
  points: LeadsTimelinePoint[],
): LeadsDayRange | null {
  const fromPoints = inferDayRangeFromPoints(points);
  if (!fromPoints) return null;

  const now = new Date();
  const end = fromPoints.last;
  let start: string;

  switch (periodo) {
    case '30d':
      start = format(addDays(now, -29), 'yyyy-MM-dd');
      break;
    case '90d':
      start = format(addDays(now, -89), 'yyyy-MM-dd');
      break;
    case '12m':
      start = format(addDays(now, -364), 'yyyy-MM-dd');
      break;
    case 'ytd':
      start = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');
      break;
    case 'todos':
    default:
      return fromPoints;
  }

  if (start > end) return fromPoints;
  return {
    first: start < fromPoints.first ? fromPoints.first : start,
    last: end,
  };
}

function filterPointsInRange(
  points: LeadsTimelinePoint[],
  dayRange: LeadsDayRange,
): LeadsTimelinePoint[] {
  return points.filter((p) => {
    const dia = String(p.dia ?? '');
    return dia >= dayRange.first && dia <= dayRange.last;
  });
}

function aggregateSegment(
  segmentDays: string[],
  sourceByDay: Map<string, LeadsTimelinePoint>,
  series: LeadsTimelineSeries[],
  labelIso: string,
  viewMode: LeadsTimelineViewMode,
  spanDays: number,
): LeadsTimelinePoint {
  const point: LeadsTimelinePoint = {
    dia: labelIso,
    label: formatLeadsTimelineDisplayLabel(spanDays, viewMode, labelIso),
  };
  for (const serie of series) {
    let sum = 0;
    for (const day of segmentDays) {
      const row = sourceByDay.get(day);
      const raw = row?.[serie.dataKey];
      sum += typeof raw === 'number' ? raw : Number(raw) || 0;
    }
    point[serie.dataKey] = sum;
  }
  return point;
}

export function buildLeadsTimelinePointsForRange(
  points: LeadsTimelinePoint[],
  series: LeadsTimelineSeries[],
  dayRange: LeadsDayRange,
  viewMode: LeadsTimelineViewMode,
): LeadsTimelinePoint[] {
  const spanDays = inclusiveSpanDays(dayRange.first, dayRange.last);
  const contactCount = resolveLeadsContactPointCount(spanDays, viewMode);
  const filtered = filterPointsInRange(points, dayRange);
  const sourceByDay = new Map(filtered.map((p) => [String(p.dia), p]));

  const allDays = eachDayOfInterval({
    start: parseISO(dayRange.first),
    end: parseISO(dayRange.last),
  }).map((d) => format(d, 'yyyy-MM-dd'));

  if (!allDays.length) return [];

  if (contactCount >= allDays.length) {
    return allDays.map((day) => {
      const existing = sourceByDay.get(day);
      const point: LeadsTimelinePoint = {
        dia: day,
        label: formatLeadsTimelineDisplayLabel(spanDays, viewMode, day),
      };
      for (const serie of series) {
        const raw = existing?.[serie.dataKey] ?? 0;
        point[serie.dataKey] = typeof raw === 'number' ? raw : Number(raw) || 0;
      }
      return point;
    });
  }

  const segmentSize = allDays.length / contactCount;
  const result: LeadsTimelinePoint[] = [];

  for (let i = 0; i < contactCount; i += 1) {
    const startIdx = Math.floor(i * segmentSize);
    const endIdx = Math.min(allDays.length, Math.floor((i + 1) * segmentSize));
    const segmentDays = allDays.slice(startIdx, endIdx);
    if (!segmentDays.length) continue;
    const labelIso = segmentDays[segmentDays.length - 1];
    result.push(aggregateSegment(segmentDays, sourceByDay, series, labelIso, viewMode, spanDays));
  }

  return result;
}

export function applyCumulativeBySeries(
  data: LeadsTimelinePoint[],
  dataKeys: string[],
): LeadsTimelinePoint[] {
  const running = Object.fromEntries(dataKeys.map((key) => [key, 0]));
  return data.map((point) => {
    const next: LeadsTimelinePoint = { ...point };
    for (const key of dataKeys) {
      const value = typeof point[key] === 'number' ? (point[key] as number) : Number(point[key]) || 0;
      running[key] += value;
      next[key] = running[key];
    }
    return next;
  });
}

export function resolveLeadsTimelineSlice(
  timeline: ApiTimeline | null,
  viewMode: LeadsTimelineViewMode,
  stacked: boolean,
  options: { dayRange?: LeadsDayRange | null; periodo?: LeadsPeriodoPreset },
): LeadsTimelineSlice {
  const empty: LeadsTimelineSlice = {
    data: [],
    xKey: 'label',
    series: [],
    formatTooltipLabel: (raw) => String(raw ?? ''),
    yTickFormatter: (v) => String(Math.round(v)),
    tooltipValueFormatter: (v) => String(Math.round(v)),
    spanDays: 0,
    contactCount: 0,
  };

  if (!timeline?.points?.length) return empty;

  const legacySeries = (timeline.series ?? []).map((item) =>
    typeof item === 'string' ? item : item.name,
  );
  const series = normalizeTimelineSeries(timeline.series ?? []);
  const remapped = remapTimelinePoints(timeline.points, series, legacySeries);

  const dayRange =
    options.dayRange ??
    (options.periodo
      ? resolveLeadsDisplayedDayRange(options.periodo, remapped)
      : inferDayRangeFromPoints(remapped));

  if (!dayRange) return empty;

  const spanDays = inclusiveSpanDays(dayRange.first, dayRange.last);
  let data = buildLeadsTimelinePointsForRange(remapped, series, dayRange, viewMode);

  if (stacked) {
    data = applyCumulativeBySeries(
      data,
      series.map((s) => s.dataKey),
    );
  }

  const formatTooltipLabel = (raw: unknown) => {
    const text = String(raw ?? '');
    const match = data.find((p) => p.label === text || p.dia === text);
    const iso = match ? String(match.dia) : text;
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
      return formatLeadsTimelineDisplayLabel(spanDays, viewMode, iso.slice(0, 10));
    }
    return text;
  };

  return {
    data,
    xKey: 'label',
    series,
    formatTooltipLabel,
    yTickFormatter: (v) => String(Math.round(v)),
    tooltipValueFormatter: (v) => String(Math.round(v)),
    spanDays,
    contactCount: data.length,
  };
}
