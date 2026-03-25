import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Espaçamento fluido das main views (clamp + % do container).
 * Ajuste centralizado: altere aqui e todas as telas que usam o shell acompanham.
 */
export const MAIN_VIEW_FLUID_SPACING = {
  padInline: 'clamp(0.25rem, 2vw, 1rem)',
  padTop: 'clamp(0.5rem, 1.75vw, 1.25rem)',
  padBottom: 'clamp(0.75rem, 2.5vw, 2rem)',
  widthPercent: 96,
} as const;

type MainViewFluidShellProps = {
  children: ReactNode;
  className?: string;
};

export function MainViewFluidShell({ children, className }: MainViewFluidShellProps) {
  return (
    <div
      className={cn(
        'box-border min-w-0 w-full max-w-full flex-1 mx-auto overflow-x-clip',
        className,
      )}
      style={{
        maxWidth: `min(100%, ${MAIN_VIEW_FLUID_SPACING.widthPercent}%)`,
        paddingInline: MAIN_VIEW_FLUID_SPACING.padInline,
        paddingTop: MAIN_VIEW_FLUID_SPACING.padTop,
        paddingBottom: MAIN_VIEW_FLUID_SPACING.padBottom,
      }}
    >
      {children}
    </div>
  );
}
