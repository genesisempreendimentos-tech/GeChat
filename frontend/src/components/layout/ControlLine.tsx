import type { ReactNode } from 'react';
import { ViewModeToggle, type ViewMode } from '@/components/ui/ViewModeToggle';

export type { ViewMode };

interface ControlLineProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  leftContent?: ReactNode;
  centerContent?: ReactNode;
  rightContent?: ReactNode;
  showViewToggle?: boolean;
}

export function ControlLine({
  viewMode,
  onViewModeChange,
  leftContent,
  centerContent,
  rightContent,
  showViewToggle = true,
}: ControlLineProps) {
  const canShowToggle = showViewToggle && !!viewMode && !!onViewModeChange;
  const viewToggle = canShowToggle ? (
    <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
  ) : null;

  if (centerContent != null) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border/40 py-3">
        <div className="flex shrink-0 flex-wrap items-center gap-3">{leftContent}</div>
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">{centerContent}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {rightContent}
          {viewToggle}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 py-3">
      <div className="flex flex-wrap items-center gap-3">{leftContent}</div>
      <div className="flex flex-wrap items-center gap-3">
        {rightContent}
        {viewToggle}
      </div>
    </div>
  );
}
