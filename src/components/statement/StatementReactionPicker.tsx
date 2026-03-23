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
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {reactions.map((emoji) => {
        const isActive = currentReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onReact?.(isActive ? null : emoji)}
            className={cn(
              'h-8 min-w-8 rounded-full border px-2 text-sm transition-colors flex items-center justify-center',
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
