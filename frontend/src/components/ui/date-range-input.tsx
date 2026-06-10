import * as React from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RangeCalendar,
  formatRangeDisplay,
  formatRangeIsoDate,
  parseRangeIsoDate,
  type RangeCalendarValue,
} from '@/components/ui/range-calendar';

export type DateRangeValue = {
  from: string;
  to: string;
};

export type DateRangeInputProps = {
  id?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
};

function toCalendarValue(value: DateRangeValue): RangeCalendarValue {
  return {
    from: parseRangeIsoDate(value.from),
    to: parseRangeIsoDate(value.to),
  };
}

function fromCalendarValue(range: RangeCalendarValue): DateRangeValue {
  return {
    from: range.from ? formatRangeIsoDate(range.from) : '',
    to: range.to ? formatRangeIsoDate(range.to) : '',
  };
}

export function DateRangeInput({
  id,
  value,
  onChange,
  className,
  placeholder = 'Selecione o intervalo de datas',
  disabled,
}: DateRangeInputProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = React.useState<{ top: number; left: number } | null>(null);

  const calendarValue = React.useMemo(() => toCalendarValue(value), [value]);
  const displayValue = formatRangeDisplay(calendarValue.from, calendarValue.to);

  React.useEffect(() => {
    if (!open) return;

    const updatePanelPosition = () => {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelWidth = 320;
      const panelHeight = 380;
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

      setPanelStyle({ top, left });
    };

    updatePanelPosition();

    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open]);

  const handleCalendarChange = (next: RangeCalendarValue) => {
    onChange(fromCalendarValue(next));
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center rounded-xl border border-input bg-transparent px-3 py-1 pr-10 text-left text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !displayValue && 'text-muted-foreground',
          className,
        )}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <span className="truncate">{displayValue || placeholder}</span>
      </button>
      <CalendarRange className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />

      {open && !disabled && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[120]"
              style={{ top: panelStyle.top, left: panelStyle.left }}
              role="dialog"
              aria-label="Selecionar intervalo de datas"
            >
              <RangeCalendar value={calendarValue} onChange={handleCalendarChange} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
