import { cn } from '@/lib/utils';
import { NotoEmoji } from '@/components/leads/NotoEmoji';
import type { LeadStatus } from '@/types/lead';
import { LEAD_STATUS_ACCENT, LEAD_STATUS_EMOJI } from '@/types/lead';

type Props = {
  status: LeadStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showRing?: boolean;
};

const sizeMap = {
  sm: { box: 'h-10 w-10', emoji: 28 },
  md: { box: 'h-12 w-12', emoji: 32 },
  lg: { box: 'h-16 w-16', emoji: 40 },
};

export function LeadMoodIcon({ status, size = 'md', className, showRing = true }: Props) {
  const emoji = LEAD_STATUS_EMOJI[status];
  const accent = LEAD_STATUS_ACCENT[status];
  const dims = sizeMap[size];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-2xl border',
        dims.box,
        accent.bg,
        accent.border,
        showRing && 'ring-2',
        showRing && accent.ring,
        className,
      )}
      title={emoji.label}
      aria-label={emoji.label}
    >
      <NotoEmoji code={emoji.code} alt={emoji.alt} size={dims.emoji} />
    </div>
  );
}

export function getLeadMoodBorderClass(status: LeadStatus): string {
  return LEAD_STATUS_ACCENT[status].border;
}
