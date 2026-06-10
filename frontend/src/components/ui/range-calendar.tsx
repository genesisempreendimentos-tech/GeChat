import * as React from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  setYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RangeCalendarValue = {
  from?: Date;
  to?: Date;
};

export type RangeCalendarProps = {
  value: RangeCalendarValue;
  onChange: (value: RangeCalendarValue) => void;
  className?: string;
  /** Mês visível inicial (controlado internamente se omitido). */
  defaultMonth?: Date;
};

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function capitalizeMonth(date: Date) {
  const raw = format(date, 'MMMM yyyy', { locale: ptBR });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildYearOptions(centerYear: number, count = 21) {
  const half = Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => centerYear - half + i);
}

export function RangeCalendar({ value, onChange, className, defaultMonth }: RangeCalendarProps) {
  const anchor = value.from ?? value.to ?? defaultMonth ?? new Date();
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(startOfMonth(anchor));
  const [yearPickerOpen, setYearPickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (value.from) setVisibleMonth(startOfMonth(value.from));
    else if (value.to) setVisibleMonth(startOfMonth(value.to));
  }, [value.from, value.to]);

  const monthStart = startOfMonth(visibleMonth);
  const monthEnd = endOfMonth(visibleMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const handleDayClick = (day: Date) => {
    const clicked = startOfDay(day);

    if (!value.from || (value.from && value.to)) {
      onChange({ from: clicked, to: undefined });
      return;
    }

    if (isSameDay(clicked, value.from)) {
      onChange({ from: clicked, to: clicked });
      return;
    }

    if (isBefore(clicked, value.from)) {
      onChange({ from: clicked, to: value.from });
      return;
    }

    onChange({ from: value.from, to: clicked });
  };

  const footerText = (() => {
    if (!value.from) return 'Selecione o intervalo de datas';
    const fromLabel = format(value.from, 'dd/MM/yyyy');
    if (!value.to) return `${fromLabel} — selecione o fim`;
    return `${fromLabel} → ${format(value.to, 'dd/MM/yyyy')}`;
  })();

  const visibleYear = visibleMonth.getFullYear();
  const years = buildYearOptions(visibleYear);

  return (
    <div
      className={cn(
        'w-[320px] rounded-2xl border border-border/70 bg-card p-5 shadow-xl',
        'dark:border-zinc-800 dark:bg-zinc-900',
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-semibold',
            'text-foreground transition-colors hover:bg-accent',
          )}
          onClick={() => setYearPickerOpen((open) => !open)}
          aria-expanded={yearPickerOpen}
        >
          <span className="truncate">{capitalizeMonth(visibleMonth)}</span>
          {yearPickerOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              setYearPickerOpen(false);
              setVisibleMonth((current) => subMonths(current, 1));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/60 text-foreground transition-colors hover:bg-accent"
            onClick={() => {
              setYearPickerOpen(false);
              setVisibleMonth((current) => addMonths(current, 1));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {yearPickerOpen ? (
        <div className="mb-4 grid max-h-[200px] grid-cols-3 gap-2 overflow-y-auto pr-1">
          {years.map((year) => {
            const selected = year === visibleYear;
            return (
              <button
                key={year}
                type="button"
                className={cn(
                  'rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                  selected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : 'bg-muted/80 text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
                onClick={() => {
                  setVisibleMonth((current) => setYear(current, year));
                  setYearPickerOpen(false);
                }}
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-7 gap-0.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[11px] font-semibold text-muted-foreground"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((day) => {
              const inCurrentMonth = isSameMonth(day, visibleMonth);
              const isStart = value.from ? isSameDay(day, value.from) : false;
              const isEnd = value.to ? isSameDay(day, value.to) : false;
              const hasRange =
                value.from && value.to && !isSameDay(value.from, value.to);
              const inRange =
                hasRange &&
                !isBefore(day, value.from!) &&
                !isAfter(day, value.to!);
              const isMiddle = Boolean(inRange && !isStart && !isEnd);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'relative flex aspect-square items-center justify-center text-xs font-medium transition-colors',
                    !inCurrentMonth && 'text-muted-foreground/40',
                    inCurrentMonth && !isStart && !isEnd && !isMiddle && 'text-foreground hover:bg-accent',
                    isMiddle && 'rounded-none bg-primary/20 text-primary',
                    isStart &&
                      isEnd &&
                      'rounded-full bg-primary text-primary-foreground',
                    isStart &&
                      !isEnd &&
                      !value.to &&
                      'rounded-full bg-primary text-primary-foreground',
                    isStart &&
                      !isEnd &&
                      value.to &&
                      hasRange &&
                      'rounded-l-full rounded-r-none bg-primary text-primary-foreground',
                    isEnd &&
                      !isStart &&
                      hasRange &&
                      'rounded-r-full rounded-l-none bg-primary text-primary-foreground',
                    today &&
                      !isStart &&
                      !isEnd &&
                      !isMiddle &&
                      'ring-2 ring-primary ring-offset-1 ring-offset-card text-primary',
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">{footerText}</p>
    </div>
  );
}

export function parseRangeIsoDate(value: string): Date | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = parseISO(trimmed);
  return isValid(parsed) ? startOfDay(parsed) : undefined;
}

export function formatRangeIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatRangeDisplay(from?: Date, to?: Date): string {
  if (!from) return '';
  const fromLabel = format(from, 'dd/MM/yyyy');
  if (!to) return `${fromLabel} — selecione o fim`;
  return `${fromLabel} → ${format(to, 'dd/MM/yyyy')}`;
}
