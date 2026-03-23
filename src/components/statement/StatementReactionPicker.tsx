import { cn } from '@/lib/utils';
import { AnimatedEmoji } from '@/components/ui/animated-emoji';

const DEFAULT_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🎉', '🔥', '🚀', '🥂', '🥳'] as const;

interface StatementReactionPickerProps {
  currentReaction?: string | null;
  onReact?: (reaction: string | null) => void;
  disabled?: boolean;
  className?: string;
  reactions?: readonly string[];
}

export default function StatementReactionPicker({
  currentReaction,
  onReact,
  disabled = false,
  className,
  reactions = DEFAULT_REACTIONS,
}: StatementReactionPickerProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5 pb-1', className)}>
      {reactions.map((emoji) => {
        const isActive = currentReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact?.(isActive ? null : emoji)}
            className={cn(
              'h-8 w-8 shrink-0 rounded-full border text-sm transition-colors flex items-center justify-center p-0',
              'hover:bg-accent disabled:opacity-60 disabled:pointer-events-none',
              isActive
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border/60 bg-background/50 text-foreground'
            )}
            aria-pressed={isActive}
            aria-label={`Reagir com ${emoji}`}
            title={isActive ? `Remover reação ${emoji}` : `Reagir com ${emoji}`}
          >
            <AnimatedEmoji 
              emoji={emoji} 
              className="w-5 h-5" 
              isActive={isActive}
            />
          </button>
        );
      })}
    </div>
  );
}
