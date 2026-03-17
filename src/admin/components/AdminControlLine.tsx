import { LayoutGrid, Table2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

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
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border/70">
      <div className="flex items-center gap-2 flex-wrap">{leftContent}</div>
      <div className="flex items-center gap-2 flex-wrap">
        {rightContent}
        {showViewToggle && (
          <div className="flex rounded-xl border border-border/70 p-1 bg-card/50 backdrop-blur-sm shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-3 rounded-lg text-xs font-medium',
                viewMode === 'table' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewModeChange('table')}
              aria-pressed={viewMode === 'table'}
            >
              <Table2 className="w-3.5 h-3.5 mr-1.5" />
              Tabela
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-3 rounded-lg text-xs font-medium',
                viewMode === 'cards' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewModeChange('cards')}
              aria-pressed={viewMode === 'cards'}
            >
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Cards
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
