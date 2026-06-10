import { cn } from '@/lib/utils';
import { getLeadDisplayId } from '@/lib/leadDisplayId';

type Props = {
  id: string;
  className?: string;
};

/** Badge discreto com ID amigável do lead (A0001). */
export function LeadDisplayIdBadge({ id, className }: Props) {
  const code = getLeadDisplayId({ id });

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5',
        'font-mono text-xs font-semibold tabular-nums tracking-tight text-primary',
        className,
      )}
    >
      {code}
    </span>
  );
}
