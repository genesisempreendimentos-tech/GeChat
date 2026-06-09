import { useState } from 'react';
import { cn } from '@/lib/utils';

const GIF_SRC = '/Gen-Moviment.gif';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<Size, string> = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
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
        'flex items-center justify-center min-h-[12rem]',
        className
      )}
    >
      <LoadingGif size="xl" />
    </div>
  );
}
