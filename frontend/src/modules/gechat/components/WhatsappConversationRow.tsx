import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Archive,
  ArchiveRestore,
  Ban,
  BellOff,
  ChevronDown,
  Heart,
  ListPlus,
  MessageSquareDot,
  MinusCircle,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react';
import { type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatLastMessagePreview } from '@/modules/gechat/lib/format-conversation-preview';
import { formatTypingPreview } from '@/modules/gechat/lib/format-typing-preview';
import { MessageStatusTicks } from '@/modules/gechat/lib/message-status-ticks';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import type { Conversation } from '@/modules/gechat/types';
import { useGeChatStore } from '@/store/gechatStore';
import { useConversationListStore } from '@/store/conversationListStore';

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatListTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return format(date, 'HH:mm');
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 6);
  if (date >= weekAgo) {
    return format(date, 'EEE', { locale: ptBR }).replace('.', '');
  }
  return format(date, 'dd/MM/yy');
}

interface WhatsappConversationRowProps {
  conversation: Conversation;
  isActive: boolean;
  archived?: boolean;
  onOpen?: (conversationId: string) => void;
}

export function WhatsappConversationRow({
  conversation,
  isActive,
  archived = false,
  onOpen,
}: WhatsappConversationRowProps) {
  const navigate = useNavigate();
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const unread = useGeChatStore((s) => {
    if (isActive) return 0;
    return s.unreadCounters[conversation.id] ?? conversation.unreadCount ?? 0;
  });
  const setUnread = useGeChatStore((s) => s.setUnread);
  const members = useGeChatStore((s) => s.membersByConversation[conversation.id] ?? []);
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversation.id] ?? []);
  const typingNames = useGeChatStore((s) => s.typingNamesByConversation[conversation.id] ?? {});
  const onlineUsers = useGeChatStore((s) => s.onlineUsers);
  const isPinned = useConversationListStore((s) => s.pinnedIds.includes(conversation.id));
  const isFavorite = useConversationListStore((s) => s.favoriteIds.includes(conversation.id));
  const isMuted = useConversationListStore((s) => s.mutedIds.includes(conversation.id));
  const togglePin = useConversationListStore((s) => s.togglePin);
  const toggleFavorite = useConversationListStore((s) => s.toggleFavorite);
  const setMuted = useConversationListStore((s) => s.setMuted);
  const archive = useConversationListStore((s) => s.archive);
  const unarchive = useConversationListStore((s) => s.unarchive);

  const label = conversation.displayName ?? conversation.name ?? 'Conversa';
  const last = conversation.lastMessage;
  const typingPreview = formatTypingPreview(typingUsers, currentUserId, {
    ...Object.fromEntries(members.map((m) => [m.id, m.name])),
    ...typingNames,
  });
  const isTyping = Boolean(typingPreview);
  const isOwnLast = last?.senderId === currentUserId;

  const senderProfile =
    last && last.senderId !== currentUserId
      ? members.find((m) => m.id === last.senderId) ??
        (conversation.otherMember?.id === last.senderId ? conversation.otherMember : undefined)
      : undefined;

  const preview = isTyping
    ? typingPreview!
    : formatLastMessagePreview(last, conversation, currentUserId, senderProfile?.name);

  const isOnline =
    conversation.type === 'direct' && conversation.otherMemberId
      ? onlineUsers[conversation.otherMemberId]
      : false;

  const showReadStatus = isOwnLast && last?.status && !isTyping;

  const handleOpenConversation = () => {
    if (unread > 0) {
      useGeChatStore.getState().clearUnread(conversation.id);
    }
    if (onOpen) {
      onOpen(conversation.id);
      return;
    }
    navigate(`/c/${conversation.id}`);
  };

  const handleRowClick = () => {
    handleOpenConversation();
  };

  const handleRowKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleRowClick();
    }
  };

  const isGroupLike = conversation.type === 'group' || conversation.type === 'channel';

  const handleMute = async (muted: boolean) => {
    try {
      if (isGroupLike) {
        await gechatApi.updateMemberSettings(conversation.id, { muted });
      }
      setMuted(conversation.id, muted);
      toast.success(muted ? 'Notificações silenciadas.' : 'Notificações reativadas.');
    } catch {
      toast.error('Não foi possível silenciar as notificações.');
    }
  };

  const handleMarkUnread = () => {
    setUnread(conversation.id, Math.max(unread, 1));
    toast.success('Marcada como não lida.');
  };

  const handleUnavailable = (action: string) => {
    toast.info(`${action} estará disponível em breve.`);
  };

  const menuItemClass =
    'gap-3 rounded-md px-3 py-2.5 text-[13px] focus:bg-muted/80 cursor-pointer';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={handleRowKeyDown}
      className={cn(
        'group relative flex cursor-pointer items-stretch transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        isActive && 'bg-muted/70',
        unread > 0 && !isActive && 'bg-primary/[0.04]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 pr-1">
        <div className="relative shrink-0">
          <Avatar className="h-[49px] w-[49px]">
            <AvatarImage src={conversation.avatar} alt="" />
            <AvatarFallback className="text-sm">{initials(label)}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-[17px] leading-snug',
              unread > 0 ? 'font-semibold text-foreground' : 'font-normal text-foreground',
            )}
          >
            {label}
          </p>

          <p
            className={cn(
              'mt-0.5 flex min-w-0 items-center gap-0.5 truncate text-[14px] leading-snug',
              isTyping ? 'italic text-primary' : 'text-muted-foreground',
              unread > 0 && !isTyping && 'font-medium text-foreground/80',
            )}
          >
            {showReadStatus && (
              <MessageStatusTicks
                status={last?.status}
                size="sm"
                readClassName="text-sky-500"
                pendingClassName="text-muted-foreground/75"
              />
            )}
            <span className="truncate">{preview}</span>
          </p>
        </div>
      </div>

      <div
        className="flex shrink-0 flex-col items-end gap-1 py-2.5 pr-3 pl-0.5"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            'text-[12px] tabular-nums leading-none',
            unread > 0 ? 'font-medium text-primary' : 'text-muted-foreground',
          )}
        >
          {last?.createdAt ? formatListTime(last.createdAt) : formatListTime(conversation.updatedAt)}
        </span>

        <div className="flex h-[18px] items-center justify-end gap-0.5">
          {unread > 0 && !isActive && (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground group-hover:hidden">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          {isPinned && (
            <Pin className="h-[15px] w-[15px] text-muted-foreground" aria-hidden />
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-[18px] w-[18px] items-center justify-center rounded-sm text-muted-foreground',
                  'opacity-0 transition-opacity hover:text-foreground',
                  'group-hover:opacity-100 data-[state=open]:opacity-100',
                )}
                aria-label="Opções da conversa"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <ChevronDown className="h-4 w-4" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-[220px] rounded-xl border-border/80 bg-popover p-1.5 shadow-xl"
          >
            {archived ? (
              <DropdownMenuItem className={menuItemClass} onClick={() => unarchive(conversation.id)}>
                <ArchiveRestore className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                Desarquivar conversa
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className={menuItemClass} onClick={() => archive(conversation.id)}>
                <Archive className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                Arquivar conversa
              </DropdownMenuItem>
            )}

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={menuItemClass}>
                <BellOff className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                {isMuted ? 'Reativar notificações' : 'Silenciar notificações'}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48 rounded-xl p-1.5">
                {isMuted ? (
                  <DropdownMenuItem className={menuItemClass} onClick={() => handleMute(false)}>
                    Reativar notificações
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuItem className={menuItemClass} onClick={() => handleMute(true)}>
                      8 horas
                    </DropdownMenuItem>
                    <DropdownMenuItem className={menuItemClass} onClick={() => handleMute(true)}>
                      1 semana
                    </DropdownMenuItem>
                    <DropdownMenuItem className={menuItemClass} onClick={() => handleMute(true)}>
                      Sempre
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem className={menuItemClass} onClick={() => togglePin(conversation.id)}>
              {isPinned ? (
                <PinOff className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              ) : (
                <Pin className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              )}
              {isPinned ? 'Desafixar conversa' : 'Fixar conversa'}
            </DropdownMenuItem>

            {unread === 0 && (
              <DropdownMenuItem className={menuItemClass} onClick={handleMarkUnread}>
                <MessageSquareDot className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                Marcar como não lida
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={menuItemClass} onClick={() => toggleFavorite(conversation.id)}>
              <Heart
                className={cn(
                  'h-[18px] w-[18px] shrink-0',
                  isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground',
                )}
              />
              {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            </DropdownMenuItem>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className={menuItemClass}>
                <ListPlus className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                Adicionar à lista
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-44 rounded-xl p-1.5">
                <DropdownMenuItem className={menuItemClass} disabled>
                  Nenhuma lista criada
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="my-1" />

            {conversation.type === 'direct' && (
              <DropdownMenuItem
                className={menuItemClass}
                onClick={() => handleUnavailable('Bloquear')}
              >
                <Ban className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                Bloquear
              </DropdownMenuItem>
            )}

            <DropdownMenuItem className={menuItemClass} onClick={() => handleUnavailable('Limpar conversa')}>
              <MinusCircle className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
              Limpar conversa
            </DropdownMenuItem>

            <DropdownMenuItem
              className={cn(menuItemClass, 'text-destructive focus:text-destructive')}
              onClick={() => handleUnavailable('Apagar conversa')}
            >
              <Trash2 className="h-[18px] w-[18px] shrink-0" />
              Apagar conversa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
