import { Building2 } from 'lucide-react';
import { DEFAULT_EMPREENDIMENTO_COLOR, empreendimentoColorHex } from '@/lib/brandColors';
import { cn } from '@/lib/utils';
import type { EmpreendimentoGenesis } from '@/types/empreendimentos';

type EmpreendimentoGenesisLogoProps = {
  item: Pick<EmpreendimentoGenesis, 'logo_url' | 'cor'>;
  size?: 'sm' | 'md';
  className?: string;
};

const sizeClass = {
  sm: 'h-9 w-9',
  md: 'h-16 w-16',
} as const;

const iconSizeClass = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
} as const;

export function EmpreendimentoGenesisLogo({
  item,
  size = 'md',
  className,
}: EmpreendimentoGenesisLogoProps) {
  const boxClass = cn(
    'inline-flex shrink-0 overflow-hidden rounded-xl border border-border/60 shadow-sm',
    sizeClass[size],
    className,
  );

  if (item.logo_url) {
    return (
      <span className={boxClass} aria-hidden>
        <img
          src={item.logo_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(boxClass, 'items-center justify-center text-white')}
      style={{
        backgroundColor: empreendimentoColorHex(item.cor ?? DEFAULT_EMPREENDIMENTO_COLOR),
      }}
      aria-hidden
    >
      <Building2 className={iconSizeClass[size]} />
    </span>
  );
}
