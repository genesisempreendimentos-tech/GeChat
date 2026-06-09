import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getLeadGender, getLeadMaleIconFilter, getLeadPersonaSrc, LEAD_MALE_ICON } from '@/lib/leadGender';
import type { Lead } from '@/types/lead';
import { LEAD_STATUS_ACCENT } from '@/types/lead';

type Props = {
  lead: Lead;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = {
  sm: 'h-10 w-10',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export function LeadCharacterAvatar({ lead, size = 'md', className }: Props) {
  const [failed, setFailed] = useState(false);
  const accent = LEAD_STATUS_ACCENT[lead.status];
  const gender = getLeadGender(lead);
  const personaSrc = getLeadPersonaSrc(gender);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-2xl border bg-muted/30 ring-2',
        sizeMap[size],
        accent.border,
        accent.ring,
        className,
      )}
      title={lead.name}
    >
      {!failed ? (
        <img
          src={personaSrc}
          alt={`Persona de ${lead.name}`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : gender === 'male' ? (
        <div className="flex h-full w-full items-center justify-center p-2">
          <img
            src={LEAD_MALE_ICON}
            alt={`Ícone de ${lead.name}`}
            className="h-full w-full object-contain"
            style={{ filter: getLeadMaleIconFilter() }}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs font-semibold text-primary">
          {initialsFromName(lead.name)}
        </div>
      )}
    </div>
  );
}
