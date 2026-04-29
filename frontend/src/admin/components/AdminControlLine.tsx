import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { ViewToggle, type ViewMode } from './ViewToggle';
export type { ViewMode } from './ViewToggle';

interface AdminControlLineProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  leftContent?: ReactNode;
  /** Se definido, o layout passa a 3 colunas: esquerda | centro (ex.: busca) | direita + toggle. */
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  showViewToggle?: boolean;
}

export function AdminControlLine({
  viewMode,
  onViewModeChange,
  leftContent,
  centerContent,
  rightContent,
  showViewToggle = true,
}: AdminControlLineProps) {
  const canShowToggle = showViewToggle && !!viewMode && !!onViewModeChange;
  const viewToggle = canShowToggle ? (
    <ViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
  ) : null;

  if (centerContent != null) {
    return (
      <div className="flex flex-wrap items-center gap-y-3 gap-x-4 py-3 border-b border-border/40">
        <div className="flex shrink-0 items-center gap-3 flex-wrap">{leftContent}</div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">{centerContent}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {rightContent}
          {viewToggle}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border/40">
      <div className="flex items-center gap-3 flex-wrap">{leftContent}</div>
      <div className="flex items-center gap-3 flex-wrap">
        {rightContent}
        {viewToggle}
      </div>
    </div>
  );
}
