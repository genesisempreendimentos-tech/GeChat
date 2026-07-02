import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { groupMessageReactions } from '@/modules/gechat/components/MessageReactionPicker';
import type { MessageReaction } from '@/modules/gechat/types';

type MemberProfile = { name: string; avatar?: string };

function formatReactorNames(
  userIds: string[],
  memberProfiles: Record<string, MemberProfile>,
  currentUserId: string,
): string {
  return userIds
    .map((id) => (id === currentUserId ? 'Você' : memberProfiles[id]?.name ?? 'Usuário'))
    .join(', ');
}

interface MessageReactionsProps {
  reactions?: MessageReaction[];
  currentUserId: string;
  alignEnd?: boolean;
  showReactorNames?: boolean;
  memberProfiles?: Record<string, MemberProfile>;
  onReact?: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  currentUserId,
  alignEnd,
  showReactorNames = false,
  memberProfiles = {},
  onReact,
}: MessageReactionsProps) {
  const groups = groupMessageReactions(reactions, currentUserId);
  if (!groups.length) return null;

  const content = (
    <div className={cn('flex flex-wrap gap-1', alignEnd ? 'justify-end' : 'justify-start')}>
      {groups.map((group) => {
        const tooltipLabel = showReactorNames
          ? formatReactorNames(group.userIds, memberProfiles, currentUserId)
          : group.count > 1
            ? `${group.count} reações`
            : 'Reação';

        const chipClass = cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors',
          group.hasOwn
            ? 'border-primary/40 bg-primary/10 text-foreground'
            : 'border-border/60 bg-card text-foreground',
          onReact && !group.hasOwn && 'hover:bg-muted',
        );

        const chip = (
          <span className={chipClass}>
            <span className="text-sm leading-none">{group.emoji}</span>
            {group.count > 1 && (
              <span className="text-[10px] font-medium opacity-70">{group.count}</span>
            )}
          </span>
        );

        const button = onReact ? (
          <button
            type="button"
            onClick={() => onReact(group.emoji)}
            className={chipClass}
            title={showReactorNames ? undefined : tooltipLabel}
          >
            <span className="text-sm leading-none">{group.emoji}</span>
            {group.count > 1 && (
              <span className="text-[10px] font-medium opacity-70">{group.count}</span>
            )}
          </button>
        ) : (
          chip
        );

        if (!showReactorNames) {
          return (
            <span key={group.emoji} className="inline-flex">
              {button}
            </span>
          );
        }

        return (
          <Tooltip key={group.emoji} delayDuration={200}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={6}
              className="max-w-[220px] border-border/80 bg-popover/95 px-2.5 py-1.5 text-xs shadow-lg backdrop-blur-sm"
            >
              {tooltipLabel}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  if (!showReactorNames) return content;

  return <TooltipProvider delayDuration={200}>{content}</TooltipProvider>;
}
