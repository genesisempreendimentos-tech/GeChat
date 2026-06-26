import { cn } from '@/lib/utils';
import { groupMessageReactions } from '@/modules/gechat/components/MessageReactionPicker';
import type { MessageReaction } from '@/modules/gechat/types';

interface MessageReactionsProps {
  reactions?: MessageReaction[];
  currentUserId: string;
  alignEnd?: boolean;
  onReact: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  currentUserId,
  alignEnd,
  onReact,
}: MessageReactionsProps) {
  const groups = groupMessageReactions(reactions, currentUserId);
  if (!groups.length) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', alignEnd ? 'justify-end' : 'justify-start')}>
      {groups.map((group) => (
        <button
          key={group.emoji}
          type="button"
          onClick={() => onReact(group.emoji)}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors',
            group.hasOwn
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border/60 bg-card text-foreground hover:bg-muted',
          )}
          title={group.count > 1 ? `${group.count} reações` : 'Reação'}
        >
          <span className="text-sm leading-none">{group.emoji}</span>
          {group.count > 1 && <span className="text-[10px] font-medium opacity-70">{group.count}</span>}
        </button>
      ))}
    </div>
  );
}
