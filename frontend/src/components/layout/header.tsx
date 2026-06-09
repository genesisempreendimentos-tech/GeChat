import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MotionFadeHeader } from '@/components/motion/AppMotion';

export interface MainViewHeaderProps {
  /** Conteúdo exibido dentro do quadrado (ex.: `<Bell className="w-6 h-6" />`). */
  icon: ReactNode;
  title: string;
  description: string;
  /** Botão ou grupo de ações à direita (opcional). */
  button?: ReactNode;
  className?: string;
}

/**
 * Header padrão da MainView — alinhado ao estilo de Notificações e demais telas internas.
 */
export function MainViewHeader({
  icon,
  title,
  description,
  button,
  className,
}: MainViewHeaderProps) {
  return (
    <MotionFadeHeader
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {button ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
          {button}
        </div>
      ) : null}
    </MotionFadeHeader>
  );
}

export default MainViewHeader;
