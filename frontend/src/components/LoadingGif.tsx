import { useState } from 'react';
import { cn } from '@/lib/utils';

const GIF_SRC = '/Gen-Moviment.gif';

type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const sizeClasses: Record<Size, string> = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
  '2xl': 'h-32 w-32',
};

interface LoadingGifProps {
  size?: Size;
  className?: string;
}

export function LoadingGif({ size = 'md', className }: LoadingGifProps) {
  const [gifFailed, setGifFailed] = useState(false);

  if (gifFailed) {
    return (
      <span
        role="presentation"
        aria-hidden
        className={cn(
          'inline-block animate-spin rounded-full border-2 border-primary border-t-transparent',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <img
      src={GIF_SRC}
      alt=""
      role="presentation"
      onError={() => setGifFailed(true)}
      className={cn('object-contain', sizeClasses[size], className)}
    />
  );
}

/** Container centralizado para telas de carregamento (ex.: ao carregar lista) */
export function LoadingGifScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[20rem] items-center justify-center',
        className
      )}
    >
      <LoadingGif size="xl" className="h-28 w-28 sm:h-32 sm:w-32" />
    </div>
  );
}
