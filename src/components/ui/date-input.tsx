import * as React from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  placeholderText?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, placeholderText = 'Selecione a data', value, onChange, onClick, onFocus, onBlur, disabled, readOnly, ...props }, ref) => {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const [panelStyle, setPanelStyle] = React.useState<{ top: number; left: number; width: number } | null>(null);
    const parsedFromValue = React.useMemo(() => {
      if (typeof value !== 'string') return undefined;
      const raw = value.trim();
      if (!raw) return undefined;
      const parsed = parseISO(raw);
      return isValid(parsed) ? parsed : undefined;
    }, [value]);
    const [visibleMonth, setVisibleMonth] = React.useState<Date>(parsedFromValue ?? new Date());

    React.useEffect(() => {
      if (parsedFromValue) setVisibleMonth(parsedFromValue);
    }, [parsedFromValue]);

    React.useEffect(() => {
      if (!open) return;
      const updatePanelPosition = () => {
        const trigger = rootRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const panelWidth = Math.max(rect.width, 280);
        const panelHeight = 308;
        const viewportPadding = 12;
        const offset = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = rect.left;
        if (left + panelWidth + viewportPadding > viewportWidth) {
          left = viewportWidth - panelWidth - viewportPadding;
        }
        if (left < viewportPadding) left = viewportPadding;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenAbove = spaceBelow < panelHeight + offset && spaceAbove > spaceBelow;
        let top = shouldOpenAbove ? rect.top - panelHeight - offset : rect.bottom + offset;
        if (top < viewportPadding) top = viewportPadding;
        if (top + panelHeight + viewportPadding > viewportHeight) {
          top = Math.max(viewportPadding, viewportHeight - panelHeight - viewportPadding);
        }

        setPanelStyle({
          top,
          left,
          width: panelWidth,
        });
      };

      updatePanelPosition();

      const handleOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const clickedTrigger = rootRef.current?.contains(target);
        const clickedPanel = panelRef.current?.contains(target);
        if (!clickedTrigger && !clickedPanel) {
          setOpen(false);
        }
      };

      const handleReposition = () => updatePanelPosition();

      document.addEventListener('mousedown', handleOutside);
      window.addEventListener('resize', handleReposition);
      window.addEventListener('scroll', handleReposition, true);
      return () => {
        document.removeEventListener('mousedown', handleOutside);
        window.removeEventListener('resize', handleReposition);
        window.removeEventListener('scroll', handleReposition, true);
      };
    }, [open]);

    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const hasValue = typeof value === 'string' && value.trim().length > 0;
    const displayValue = hasValue && parsedFromValue ? format(parsedFromValue, 'dd/MM/yyyy') : '';

    const selectDate = (date: Date) => {
      if (disabled || readOnly) return;
      const iso = format(date, 'yyyy-MM-dd');
      onChange?.({
        target: { value: iso },
        currentTarget: { value: iso },
      } as React.ChangeEvent<HTMLInputElement>);
      setOpen(false);
    };

    return (
      <div className="relative" ref={rootRef}>
        <input
          {...props}
          ref={ref}
          type="text"
          inputMode="none"
          value={displayValue}
          readOnly
          disabled={disabled}
          placeholder={placeholderText}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 pr-10 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          onClick={(event) => {
            onClick?.(event);
            if (!disabled && !readOnly) setOpen(true);
          }}
          onFocus={(event) => {
            onFocus?.(event);
            if (!disabled && !readOnly) setOpen(true);
          }}
          onBlur={(event) => onBlur?.(event)}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />

        {open && !disabled && !readOnly && panelStyle
          ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[120] rounded-xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-xl"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/60 text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-foreground">
                {format(visibleMonth, "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/60 text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
                <div key={`${day}-${index}`} className="py-1 text-center text-[11px] font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, visibleMonth);
                const selected = parsedFromValue ? isSameDay(day, parsedFromValue) : false;
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-md text-xs font-medium transition-colors',
                      !isCurrentMonth && 'text-muted-foreground/45',
                      isCurrentMonth && !selected && 'text-foreground hover:bg-primary/10 hover:text-primary',
                      selected && 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                    )}
                    onClick={() => selectDate(day)}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
            </div>,
            document.body
          )
          : null}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';

export { DateInput };
