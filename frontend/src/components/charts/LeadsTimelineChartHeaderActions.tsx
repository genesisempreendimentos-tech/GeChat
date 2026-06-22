import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LeadsTimelineViewMode } from '@/lib/leadsTimelineChart';
import { TROIA_INFO_TOOLTIP } from '@/lib/empreendimentosTroia';
import {
  AudioWaveform,
  Axis3d,
  ChessKnight,
  Eye,
  EyeOff,
  GitFork,
  LayersPlus,
  SquaresUnite,
} from 'lucide-react';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

type LeadsTimelineChartHeaderActionsProps = {
  viewMode: LeadsTimelineViewMode;
  onViewModeChange: (mode: LeadsTimelineViewMode) => void;
  isStacked: boolean;
  onStackedChange: (value: boolean) => void;
  isMerged: boolean;
  onMergedChange: (value: boolean) => void;
  isTroiaEnabled: boolean;
  onTroiaEnabledChange: (value: boolean) => void;
  isAverageEnabled: boolean;
  onAverageEnabledChange: (value: boolean) => void;
  allSeriesSelected: boolean;
  onAllSeriesSelectedChange: (value: boolean) => void;
  className?: string;
};

/** TabButtons de grain + alternador compacto/detalhado e toggles com ícones (padrão GêSite). */
export function LeadsTimelineChartHeaderActions({
  viewMode,
  onViewModeChange,
  isStacked,
  onStackedChange,
  isMerged,
  onMergedChange,
  isTroiaEnabled,
  onTroiaEnabledChange,
  isAverageEnabled,
  onAverageEnabledChange,
  allSeriesSelected,
  onAllSeriesSelectedChange,
  className,
}: LeadsTimelineChartHeaderActionsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      <div
        role="group"
        aria-label="Alternar visualização entre compacto e detalhado"
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-input bg-background/80 p-1 shadow-sm"
      >
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Compacto"
              aria-pressed={viewMode === 'compacto'}
              onClick={() => onViewModeChange('compacto')}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full p-1 transition-colors',
                viewMode === 'compacto'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <SquaresUnite className="size-3.5 shrink-0" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="text-xs">
            Compacto
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Detalhado"
              aria-pressed={viewMode === 'detalhado'}
              onClick={() => onViewModeChange('detalhado')}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-full p-1 transition-colors',
                viewMode === 'detalhado'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <AudioWaveform className="size-3.5 shrink-0" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="text-xs">
            Detalhado
          </TooltipContent>
        </Tooltip>
      </div>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Empilhamento"
            aria-pressed={isStacked}
            onClick={() => onStackedChange(!isStacked)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              isStacked
                ? 'border-primary/70 bg-primary/15 text-primary'
                : 'text-foreground hover:bg-accent hover:text-foreground',
              FOCUS_RING,
            )}
          >
            <LayersPlus className="size-4 shrink-0" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          Empilhamento
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Média"
            aria-pressed={isAverageEnabled}
            onClick={() => onAverageEnabledChange(!isAverageEnabled)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              isAverageEnabled
                ? 'border-primary/70 bg-primary/15 text-primary'
                : 'text-foreground hover:bg-accent hover:text-foreground',
              FOCUS_RING,
            )}
          >
            <Axis3d className="size-4 shrink-0" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          Média
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Copilado"
            aria-pressed={isMerged}
            onClick={() => onMergedChange(!isMerged)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              isMerged
                ? 'border-primary/70 bg-primary/15 text-primary'
                : 'text-foreground hover:bg-accent hover:text-foreground',
              FOCUS_RING,
            )}
          >
            <GitFork className="size-4 shrink-0 -rotate-90" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          Copilado
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Tróia"
            aria-pressed={isTroiaEnabled}
            onClick={() => onTroiaEnabledChange(!isTroiaEnabled)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              isTroiaEnabled
                ? 'border-primary/70 bg-primary/15 text-primary'
                : 'text-foreground hover:bg-accent hover:text-foreground',
              FOCUS_RING,
            )}
          >
            <ChessKnight className="size-4 shrink-0" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs text-xs">
          {TROIA_INFO_TOOLTIP}
        </TooltipContent>
      </Tooltip>

      <span className="mx-1 shrink-0 select-none text-muted-foreground/60" aria-hidden="true">
        |
      </span>

      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={
              allSeriesSelected ? 'Ocultar todas as séries' : 'Exibir todas as séries'
            }
            onClick={() => onAllSeriesSelectedChange(!allSeriesSelected)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              'text-foreground hover:bg-accent hover:text-foreground',
              FOCUS_RING,
            )}
          >
            {allSeriesSelected ? (
              <EyeOff className="size-4 shrink-0" strokeWidth={2} />
            ) : (
              <Eye className="size-4 shrink-0" strokeWidth={2} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          {allSeriesSelected ? 'Ocultar todas as séries' : 'Exibir todas as séries'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
