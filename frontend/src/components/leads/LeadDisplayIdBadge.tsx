import { cn } from '@/lib/utils';
import { getLeadDisplayId } from '@/lib/leadDisplayId';

type Props = {
  id: string;
  codigo?: string | null;
  className?: string;
};

/** Badge discreto com ID amigável do lead (A0000). */
export function LeadDisplayIdBadge({ id, codigo, className }: Props) {
  const code = getLeadDisplayId({ id, codigo });

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
