import { LoadingGif } from '@/components/LoadingGif';

type LeadsLoadingProgressProps = {
  /** Progresso real do download (0–100), vindo do useLeadsData. */
  progress: number;
  minHeightClassName?: string;
};

/** Loading dos leads com barra fiel ao download (bytes baixados / total). */
export function LeadsLoadingProgress({
  progress,
  minHeightClassName = 'min-h-[28rem]',
}: LeadsLoadingProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className={`flex ${minHeightClassName} flex-col items-center justify-center gap-6`}>
      <LoadingGif size="xl" className="h-28 w-28 sm:h-32 sm:w-32" />
      <div className="w-[min(92vw,28rem)]">
        <div
          className="h-3.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Carregando leads"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <p className="mt-3 text-center text-sm font-medium text-muted-foreground">
          Carregando leads… {clamped}%
        </p>
      </div>
    </div>
  );
}
