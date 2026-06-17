import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  DEFAULT_TIMELINE_METRIC_OPTIONS,
  TIMELINE_METRIC_LABELS,
  type TimelineMetricId,
  type TimelinePeriodId,
  type TimelineViewMode,
} from '@/lib/dashboardTimelineChart';
import { AudioWaveform, Axis3d, Eye, EyeOff, GitFork, LayersPlus, SquaresUnite } from 'lucide-react';

export type DashboardTimelineChartHeaderActionsProps = {
  metric: TimelineMetricId;
  onMetricChange: (v: TimelineMetricId) => void;
  period: TimelinePeriodId;
  onPeriodChange: (v: TimelinePeriodId) => void;
  metricOptions?: TimelineMetricId[];
  viewMode: TimelineViewMode;
  onViewModeChange: (v: TimelineViewMode) => void;
  isStacked: boolean;
  onStackedChange: (v: boolean) => void;
  isGesiteMerged: boolean;
  onGesiteMergedChange: (v: boolean) => void;
  isAverageEnabled: boolean;
  onAverageEnabledChange: (v: boolean) => void;
  allPagesSelected: boolean;
  onAllPagesSelectedChange: (v: boolean) => void;
  /** Quando false, oculta o dropdown Horas / Dias / Semanas / Meses / Anos. */
  showPeriodSelect?: boolean;
};

/** Dropdowns de métrica e período + alternador de vista (detalhado → compacto → empilhamento — só UI). */
export function DashboardTimelineChartHeaderActions({
  metric,
  onMetricChange,
  period,
  onPeriodChange,
  metricOptions = DEFAULT_TIMELINE_METRIC_OPTIONS,
  viewMode,
  onViewModeChange,
  isStacked,
  onStackedChange,
  isGesiteMerged,
  onGesiteMergedChange,
  isAverageEnabled,
  onAverageEnabledChange,
  allPagesSelected,
  onAllPagesSelectedChange,
  showPeriodSelect = true,
}: DashboardTimelineChartHeaderActionsProps) {
  return (
    <>
      <Select value={metric} onValueChange={(v) => onMetricChange(v as TimelineMetricId)}>
        <SelectTrigger
          className="h-9 w-full min-w-[9.5rem] max-w-[13rem] sm:w-44"
          aria-label="Métrica ativa"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {metricOptions.map((option) => (
            <SelectItem key={option} value={option}>
              {TIMELINE_METRIC_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showPeriodSelect ? (
        <Select value={period} onValueChange={(v) => onPeriodChange(v as TimelinePeriodId)}>
          <SelectTrigger className="h-9 w-full min-w-[8rem] max-w-[10rem] sm:w-36" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="hours">Horas</SelectItem>
            <SelectItem value="days">Dias</SelectItem>
            <SelectItem value="weeks">Semanas</SelectItem>
            <SelectItem value="months">Meses</SelectItem>
            <SelectItem value="years">Anos</SelectItem>
          </SelectContent>
        </Select>
      ) : null}
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
            aria-pressed={isGesiteMerged}
            onClick={() => onGesiteMergedChange(!isGesiteMerged)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              isGesiteMerged
                ? 'border-primary/70 bg-primary/15 text-primary'
                : 'text-foreground hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            <GitFork className="size-4 shrink-0 -rotate-90" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          Copilado
        </TooltipContent>
      </Tooltip>
      <span className="mx-1 shrink-0 select-none text-muted-foreground/60" aria-hidden="true">
        |
      </span>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={allPagesSelected ? 'Ocultar todas as páginas' : 'Exibir todas as páginas'}
            onClick={() => onAllPagesSelectedChange(!allPagesSelected)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-input bg-background/80 shadow-sm transition-colors',
              'text-foreground hover:bg-accent hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
          >
            {allPagesSelected ? (
              <EyeOff className="size-4 shrink-0" strokeWidth={2} />
            ) : (
              <Eye className="size-4 shrink-0" strokeWidth={2} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="text-xs">
          {allPagesSelected ? 'Ocultar todas as páginas' : 'Exibir todas as páginas'}
        </TooltipContent>
      </Tooltip>
    </>
  );
}
