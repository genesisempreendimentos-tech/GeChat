import { cn } from '@/lib/utils';

type Props = {
  code: string;
  alt: string;
  size?: number;
  className?: string;
};

export function NotoEmoji({ code, alt, size = 32, className }: Props) {
  const base = `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/512`;
  return (
    <picture className={cn('inline-flex', className)}>
      <source srcSet={`${base}.webp`} type="image/webp" />
      <img
        src={`${base}.gif`}
        alt={alt}
        width={size}
        height={size}
        className="block select-none"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}
