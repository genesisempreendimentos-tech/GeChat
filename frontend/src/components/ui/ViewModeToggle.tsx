import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'cards';

export interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
  tableLabel?: string;
  cardsLabel?: string;
  tableIcon?: ReactNode;
  cardsIcon?: ReactNode;
}

export function ViewModeToggle({
  viewMode,
  onViewModeChange,
  className,
  tableLabel = 'Tabela',
  cardsLabel = 'Cards',
  tableIcon = <Table2 className="h-4 w-4 shrink-0" />,
  cardsIcon = <LayoutGrid className="h-4 w-4 shrink-0" />,
}: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'flex rounded-xl border border-border/60 bg-muted/30 p-1 shadow-sm transition-colors hover:border-border/80',
        className,
      )}
      role="group"
      aria-label="Alternar visualização"
    >
      <button
        type="button"
        className={cn(
          'flex h-8 items-center rounded-lg text-sm font-medium transition-all duration-300',
          viewMode === 'table'
            ? 'bg-primary px-3 text-primary-foreground shadow-md'
            : 'px-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
        onClick={() => onViewModeChange('table')}
        aria-pressed={viewMode === 'table'}
      >
        {tableIcon}
        <AnimatePresence initial={false}>
          {viewMode === 'table' && (
            <motion.span
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden whitespace-nowrap"
            >
              {tableLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <button
        type="button"
        className={cn(
          'flex h-8 items-center rounded-lg text-sm font-medium transition-all duration-300',
          viewMode === 'cards'
            ? 'bg-primary px-3 text-primary-foreground shadow-md'
            : 'px-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        )}
        onClick={() => onViewModeChange('cards')}
        aria-pressed={viewMode === 'cards'}
      >
        {cardsIcon}
        <AnimatePresence initial={false}>
          {viewMode === 'cards' && (
            <motion.span
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden whitespace-nowrap"
            >
              {cardsLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
