import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useGeChatStore } from '@/store/gechatStore';
import type { Conversation } from '@/modules/gechat/types';
import { NewConversationDialog } from './NewConversationDialog';

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

interface DirectConversationsHomeProps {
  conversations: Conversation[];
  onCreated: (id: string) => void;
}

export function DirectConversationsHome({ conversations, onCreated }: DirectConversationsHomeProps) {
  const unreadCounters = useGeChatStore((s) => s.unreadCounters);
  const onlineUsers = useGeChatStore((s) => s.onlineUsers);
  const direct = conversations.filter((c) => c.type === 'direct');

  return (
    <div className="flex h-full min-h-[calc(100vh-5rem)] flex-col px-4 py-4 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Conversas diretas</h1>
          <p className="text-sm text-muted-foreground">Selecione alguém para conversar ou inicie uma nova.</p>
        </div>
        <NewConversationDialog onCreated={onCreated} />
      </div>

      {direct.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
          <MessageSquare className="h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhuma conversa direta ainda.</p>
          <NewConversationDialog onCreated={onCreated} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {direct.map((conv) => {
            const label = conv.displayName ?? conv.name ?? 'Conversa';
            const unread = unreadCounters[conv.id] ?? 0;
            const isOnline = conv.otherMemberId ? onlineUsers[conv.otherMemberId] : false;

            return (
              <Link key={conv.id} to={`/c/${conv.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/40">
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={conv.avatar} alt="" />
                      <AvatarFallback>{initials(label)}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{label}</span>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-5 shrink-0 justify-center px-1.5 text-[10px]">
                          {unread > 99 ? '99+' : unread}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conv.lastMessage?.content ?? 'Sem mensagens'}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                      {formatTime(conv.lastMessage?.createdAt ?? conv.updatedAt)}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
