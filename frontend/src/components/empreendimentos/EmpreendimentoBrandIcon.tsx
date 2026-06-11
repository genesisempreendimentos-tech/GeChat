import {
  empreendimentoIconNeedsDarkBackdrop,
  getEmpreendimentoIconUrl,
} from '@/lib/empreendimentoIcons';
import { cn } from '@/lib/utils';

type EmpreendimentoBrandIconProps = {
  pagina?: string;
  name?: string;
  className?: string;
  size?: 'sm' | 'md';
};

export function EmpreendimentoBrandIcon({
  pagina,
  name,
  className,
  size = 'md',
}: EmpreendimentoBrandIconProps) {
  const lookup = pagina?.trim() || name?.trim() || '';
  const src = getEmpreendimentoIconUrl(lookup);
  if (!src) return null;

  const darkBackdrop = empreendimentoIconNeedsDarkBackdrop(lookup);
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-12 w-12';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 p-2 shadow-sm',
        darkBackdrop ? 'bg-slate-900' : 'bg-card',
        dim,
        className,
      )}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="max-h-full max-w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
