import { useState } from 'react';
import {
  Forward,
  MessageSquarePlus,
  MoreVertical,
  Pencil,
  Pin,
  Reply,
  SmilePlus,
  Star,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MessageReactionPicker } from '@/modules/gechat/components/MessageReactionPicker';
import type { Message } from '@/modules/gechat/types';

const QUICK_REACTIONS = ['👍', '😂', '🙏'] as const;

function ToolbarButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

interface MessageActionBarProps {
  message: Message;
  isOwn: boolean;
  isStarred: boolean;
  isPinned: boolean;
  canEdit: boolean;
  alignEnd?: boolean;
  onReact: (emoji: string) => void;
  onQuote: () => void;
  onForward: () => void;
  onToggleRead: () => void;
  onToggleStar: () => void;
  onTogglePin: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function MessageActionBar({
  message,
  isOwn,
  isStarred,
  isPinned,
  canEdit,
  alignEnd,
  onReact,
  onQuote,
  onForward,
  onToggleRead,
  onToggleStar,
  onTogglePin,
  onDelete,
  onEdit,
}: MessageActionBarProps) {
  void message;
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setPickerOpen(false);
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-full z-10 mt-1 flex gap-1.5 opacity-0 transition-opacity',
        'group-hover/message:pointer-events-auto group-hover/message:opacity-100',
        'group-focus-within/message:pointer-events-auto group-focus-within/message:opacity-100',
        '[&:has([data-state=open])]:pointer-events-auto [&:has([data-state=open])]:opacity-100',
        alignEnd ? 'right-0' : 'left-0',
      )}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card px-1.5 py-1 shadow-md">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Reagir com ${emoji}`}
            onClick={() => handleReact(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-muted"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card px-1 py-1 shadow-md">
        <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Adicionar reação"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors',
                'hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground',
              )}
            >
              <SmilePlus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={alignEnd ? 'end' : 'start'} className="p-0">
            <MessageReactionPicker onSelect={handleReact} />
          </DropdownMenuContent>
        </DropdownMenu>

        {isOwn && canEdit && onEdit && (
          <ToolbarButton label="Editar" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </ToolbarButton>
        )}

        <ToolbarButton label="Citar na resposta" onClick={onQuote}>
          <Reply className="h-4 w-4" />
        </ToolbarButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Mais opções"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors',
                'hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground',
              )}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={alignEnd ? 'end' : 'start'} className="w-56">
            {isOwn ? (
              <>
                <DropdownMenuItem onClick={onQuote}>
                  <Reply className="mr-2 h-4 w-4" />
                  Citar na resposta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onForward}>
                  <Forward className="mr-2 h-4 w-4" />
                  Encaminhar mensagem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleRead}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Marcar como não lida
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleStar}>
                  <Star className={cn('mr-2 h-4 w-4', isStarred && 'fill-current text-amber-500')} />
                  {isStarred ? 'Remover estrela' : 'Marcar com estrela'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className={cn('mr-2 h-4 w-4', isPinned && 'fill-current')} />
                  {isPinned ? 'Desafixar' : 'Fixar no quadro'}
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </>
            ) : (
              <>
                <DropdownMenuItem onClick={onQuote}>
                  <Reply className="mr-2 h-4 w-4" />
                  Citar na resposta
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onToggleRead}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Marcar como lida
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleStar}>
                  <Star className={cn('mr-2 h-4 w-4', isStarred && 'fill-current text-amber-500')} />
                  {isStarred ? 'Remover estrela' : 'Marcar com estrela'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onTogglePin}>
                  <Pin className={cn('mr-2 h-4 w-4', isPinned && 'fill-current')} />
                  {isPinned ? 'Desafixar' : 'Fixar no quadro'}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
