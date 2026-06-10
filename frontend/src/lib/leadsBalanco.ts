import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import type { LeadsBalancoMode } from '@/lib/leadsControlLine';

export type DateRange = { start: Date; end: Date };

export function getLeadsBalancoRanges(mode: LeadsBalancoMode): { current: DateRange; previous: DateRange } | null {
  if (mode === 'desligado') return null;

  const now = new Date();
  const todayEnd = endOfDay(now);

  if (mode === 'mes_anterior') {
    const prevMonth = subMonths(now, 1);
    return {
      current: { start: startOfMonth(now), end: todayEnd },
      previous: { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) },
    };
  }

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const prevWeek = subWeeks(now, 1);
  return {
    current: { start: weekStart, end: todayEnd },
    previous: {
      start: startOfWeek(prevWeek, { weekStartsOn: 1 }),
      end: endOfWeek(prevWeek, { weekStartsOn: 1 }),
    },
  };
}

export function filterRowsByBalancoRange<T>(
  rows: T[],
  range: DateRange,
  getDate: (row: T) => string,
): T[] {
  const start = startOfDay(range.start).getTime();
  const end = endOfDay(range.end).getTime();
  return rows.filter((row) => {
    const t = new Date(getDate(row)).getTime();
    return !Number.isNaN(t) && t >= start && t <= end;
  });
}
