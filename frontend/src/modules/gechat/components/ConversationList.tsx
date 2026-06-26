import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useGeChatStore } from '@/store/gechatStore';
import type { Conversation } from '@/modules/gechat/types';

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

function conversationLabel(conv: Conversation) {
  return conv.displayName ?? conv.name ?? 'Conversa';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}

export function ConversationList({ conversations, activeId, onSelect, compact }: ConversationListProps) {
  const unreadCounters = useGeChatStore((s) => s.unreadCounters);
  const typingUsersByConversation = useGeChatStore((s) => s.typingUsersByConversation);
  const onlineUsers = useGeChatStore((s) => s.onlineUsers);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);

  if (!conversations.length && !compact) {
    return null;
  }

  return (
    <ul className={cn('divide-y divide-border/40', compact ? 'pb-1' : '')}>
      {conversations.map((conv) => {
        const unread = unreadCounters[conv.id] ?? 0;
        const typing = (typingUsersByConversation[conv.id] ?? []).filter((id) => id !== currentUserId);
        const isOnline = conv.type === 'direct' && conv.otherMemberId ? onlineUsers[conv.otherMemberId] : false;
        const label = conversationLabel(conv);

        return (
          <li key={conv.id}>
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={cn(
                'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                activeId === conv.id && 'bg-muted/60',
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={conv.avatar} alt="" />
                  <AvatarFallback className="text-xs">{initials(label)}</AvatarFallback>
                </Avatar>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{label}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatTime(conv.lastMessage?.createdAt ?? conv.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {typing.length > 0 ? 'digitando...' : conv.lastMessage?.content ?? 'Sem mensagens'}
                  </p>
                  {unread > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                      {unread > 99 ? '99+' : unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
