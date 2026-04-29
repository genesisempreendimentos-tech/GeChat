import { useCallback, useEffect, useRef, useState } from 'react';
import { Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const CLOSE_DELAY_MS = 3000;

export function StatementTagBadge({ label }: { label: string }) {
  const [expanded, setExpanded] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const handlePointerEnter = () => {
    clearCloseTimer();
    setExpanded(true);
  };

  const handlePointerLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setExpanded(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  };

  return (
    <span
      role="presentation"
      onMouseEnter={handlePointerEnter}
      onMouseLeave={handlePointerLeave}
      className={cn(
        'inline-flex shrink-0 cursor-default select-none items-center overflow-hidden rounded-full border border-primary/25 bg-primary/10 text-xs font-semibold text-primary',
        'transition-[max-width] duration-300 ease-out',
        expanded
          ? 'max-w-[min(100%,14rem)] gap-1 px-2.5 py-1'
          : 'h-7 w-7 max-w-[1.75rem] justify-center',
      )}
    >
      <Tag className="pointer-events-none h-3.5 w-3.5 shrink-0" aria-hidden />
      <span
        className={cn(
          'min-w-0 truncate transition-[opacity,max-width,margin] duration-200 ease-out',
          expanded ? 'max-w-[min(11rem,100%)] opacity-100' : 'ml-0 max-w-0 opacity-0',
        )}
      >
        {label}
      </span>
    </span>
  );
}
