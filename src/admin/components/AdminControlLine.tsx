import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ViewMode = 'table' | 'cards';

interface AdminControlLineProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  showViewToggle?: boolean;
}

export function AdminControlLine({
  viewMode,
  onViewModeChange,
  leftContent,
  rightContent,
  showViewToggle = true,
}: AdminControlLineProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border/40">
      <div className="flex items-center gap-3 flex-wrap">{leftContent}</div>
      <div className="flex items-center gap-3 flex-wrap">
        {rightContent}
        {showViewToggle && (
          <div className="flex rounded-xl border border-border/60 p-1 bg-muted/30 shadow-sm transition-colors hover:border-border/80">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                viewMode === 'table' ? 'bg-primary text-primary-foreground shadow-md px-3' : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              onClick={() => onViewModeChange('table')}
              aria-pressed={viewMode === 'table'}
            >
              <Table2 className="w-4 h-4 shrink-0" />
              <AnimatePresence initial={false}>
                {viewMode === 'table' && (
                  <motion.span
                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                    animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Tabela
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 rounded-lg text-sm font-medium transition-all duration-300 flex items-center',
                viewMode === 'cards' ? 'bg-primary text-primary-foreground shadow-md px-3' : 'px-2 text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              onClick={() => onViewModeChange('cards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <AnimatePresence initial={false}>
                {viewMode === 'cards' && (
                  <motion.span
                    initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                    animate={{ width: 'auto', opacity: 1, marginLeft: 6 }}
                    exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    Cards
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
