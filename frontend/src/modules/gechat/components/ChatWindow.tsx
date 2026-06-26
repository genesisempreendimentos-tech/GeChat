import { useMemo } from 'react';
import { ArrowLeft, PanelRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useGeChatStore } from '@/store/gechatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { PresenceBadge } from './PresenceBadge';
import type { Conversation, MessageType } from '@/modules/gechat/types';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversation: Conversation;
  onSend: (content: string, type?: MessageType) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onBack?: () => void;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
}

export function ChatWindow({
  conversation,
  onSend,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onBack,
  infoOpen,
  onToggleInfo,
}: ChatWindowProps) {
  const messages = useGeChatStore((s) => s.messagesByConversation[conversation.id] ?? []);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const members = useGeChatStore((s) => s.membersByConversation[conversation.id] ?? []);
  const connectionStatus = useGeChatStore((s) => s.connectionStatus);
  const myGroupRole = useGeChatStore((s) => s.myGroupRoleByConversation[conversation.id]);

  const memberProfiles = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    for (const m of members) {
      map[m.id] = { name: m.name, avatar: m.avatar };
    }
    if (conversation.otherMember) {
      map[conversation.otherMember.id] = {
        name: conversation.otherMember.name,
        avatar: conversation.otherMember.avatar,
      };
    }
    return map;
  }, [members, conversation]);

  const title = conversation.displayName ?? conversation.name ?? 'Conversa';
  const initials = title.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const isGroup = conversation.type === 'group';
  const sendRestricted =
    isGroup && Boolean(conversation.onlyAdminsCanSend) && myGroupRole !== 'admin';
  const headerOpensInfo = isGroup && Boolean(onToggleInfo);
  const showInfoButton = Boolean(onToggleInfo) && !isGroup;

  const headerMainClass = cn(
    'flex min-w-0 flex-1 items-center gap-2 text-left',
    headerOpensInfo && [
      '-my-1 rounded-lg px-1 py-1 transition-colors',
      'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      infoOpen && 'bg-muted/60',
    ],
  );

  const headerMainContent = (
    <>
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={conversation.avatar} alt="" />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {conversation.type === 'direct' && (
          <PresenceBadge userId={conversation.otherMemberId} />
        )}
        {conversation.type !== 'direct' && (
          <p className="text-xs text-muted-foreground">
            {conversation.type === 'channel'
              ? `Canal · ${conversation.channelSubtype ?? 'geral'}`
              : 'Grupo'}
            {members.length > 0 && ` · ${members.length} membros`}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-3 py-2.5 md:px-4">
        {onBack && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {headerOpensInfo ? (
          <button
            type="button"
            className={headerMainClass}
            onClick={onToggleInfo}
            aria-label="Informações do grupo"
            aria-expanded={infoOpen}
          >
            {headerMainContent}
          </button>
        ) : (
          <div className={headerMainClass}>{headerMainContent}</div>
        )}
        {showInfoButton && (
          <Button
            variant={infoOpen ? 'secondary' : 'ghost'}
            size="icon"
            className="hidden h-8 w-8 shrink-0 lg:flex"
            onClick={onToggleInfo}
            aria-label="Detalhes da conversa"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={currentUserId ?? ''}
          memberProfiles={memberProfiles}
          conversationId={conversation.id}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onToggleReaction={onToggleReaction}
        />
      </div>
      {sendRestricted && (
        <p className="shrink-0 border-t border-border/60 bg-muted/20 px-4 py-2 text-center text-xs text-muted-foreground">
          Somente administradores podem enviar mensagens neste grupo.
        </p>
      )}
      <MessageInput
        conversationId={conversation.id}
        onSend={onSend}
        disabled={connectionStatus === 'error' || sendRestricted}
      />
    </div>
  );
}
