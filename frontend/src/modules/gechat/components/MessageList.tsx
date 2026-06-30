import { format } from 'date-fns';
import { ExternalLink, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { MessageActionBar } from '@/modules/gechat/components/MessageActionBar';
import { MessageReadReceiptsDialog } from '@/modules/gechat/components/MessageReadReceiptsDialog';
import { GeChatProfilePopup } from '@/modules/gechat/components/GeChatProfilePopup';
import { ChatWallpaperBackground } from '@/modules/gechat/components/ChatWallpaperBackground';
import { MessageReactions } from '@/modules/gechat/components/MessageReactions';
import { MessageStatusTicks } from '@/modules/gechat/lib/message-status-ticks';
import { useGeChatStore } from '@/store/gechatStore';
import type { Message } from '@/modules/gechat/types';
import {
  getMessagePlainText,
  isEditableMessage,
  parseMessageContent,
  renderFormattedText,
} from '@/modules/gechat/lib/message-content';
import { formatTypingPreview } from '@/modules/gechat/lib/format-typing-preview';
function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusIcon({ status }: { status: Message['status'] }) {
  return (
    <MessageStatusTicks
      status={status}
      size="md"
      readClassName="text-sky-300"
      pendingClassName="text-primary-foreground/70"
    />
  );
}

export type MemberProfile = {
  name: string;
  avatar?: string;
};

function MessageAvatar({
  profile,
  onPress,
}: {
  profile: MemberProfile;
  onPress?: () => void;
}) {
  const avatar = (
    <Avatar className={cn('h-7 w-7 shrink-0', onPress && 'cursor-pointer transition-opacity hover:opacity-90')}>
      <AvatarImage src={profile.avatar} alt={profile.name} />
      <AvatarFallback className="text-[10px]">{initials(profile.name)}</AvatarFallback>
    </Avatar>
  );

  if (!onPress) {
    return <span className="mt-1 shrink-0">{avatar}</span>;
  }

  return (
    <button
      type="button"
      className="mt-1 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onPress}
      aria-label={`Ver perfil de ${profile.name}`}
    >
      {avatar}
    </button>
  );
}

function MessageBody({ message }: { message: Message }) {
  const parsed = parseMessageContent(message);

  if (parsed.kind === 'sticker') {
    return <p className="text-4xl leading-none">{parsed.emoji}</p>;
  }

  if (parsed.kind === 'image') {
    return (
      <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={parsed.url}
          alt={parsed.name ?? 'Imagem'}
          className="max-h-64 max-w-full rounded-lg object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  if (parsed.kind === 'file') {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 hover:bg-background/80"
      >
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{parsed.name}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </a>
    );
  }

  if (parsed.kind === 'link') {
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg border border-border/60 bg-background/50 px-3 py-2 hover:bg-background/80"
      >
        <p className="text-sm font-medium">{parsed.title ?? parsed.url}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{parsed.url}</p>
      </a>
    );
  }

  return <div className="whitespace-pre-wrap break-words">{renderFormattedText(parsed.text)}</div>;
}

function TypingBubble({
  conversationId,
  memberProfiles,
}: {
  conversationId: string;
  memberProfiles: Record<string, MemberProfile>;
}) {
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversationId] ?? []);
  const typingNames = useGeChatStore((s) => s.typingNamesByConversation[conversationId] ?? {});
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const members = useGeChatStore((s) => s.membersByConversation[conversationId] ?? []);

  const typingPreview = formatTypingPreview(typingUsers, currentUserId, {
    ...Object.fromEntries(members.map((m) => [m.id, m.name])),
    ...typingNames,
  });
  if (!typingPreview) return null;

  const typerId = typingUsers.find((id) => id !== currentUserId) ?? typingUsers[0];
  const profile =
    memberProfiles[typerId] ??
    (() => {
      const member = members.find((m) => m.id === typerId);
      return member ? { name: member.name, avatar: member.avatar } : { name: 'Alguém' };
    })();

  return (
    <motion.div
      className="flex flex-row gap-2"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      role="status"
      aria-live="polite"
      aria-label={typingPreview}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      >
        <MessageAvatar profile={profile} />
      </motion.div>
      <div className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm italic text-muted-foreground shadow-sm">
        {typingPreview}
      </div>
    </motion.div>
  );
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  memberProfiles: Record<string, MemberProfile>;
  conversationId: string;
  isGroupLike?: boolean;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  memberProfiles,
  conversationId,
  isGroupLike = false,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastScrollTailRef = useRef<string | null>(null);
  const hideActionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeActionsId, setActiveActionsId] = useState<string | null>(null);
  const [actionsMenuLocked, setActionsMenuLocked] = useState(false);
  const [detailsMessageId, setDetailsMessageId] = useState<string | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversationId] ?? []);
  const setReplyTo = useGeChatStore((s) => s.setReplyTo);
  const setUnread = useGeChatStore((s) => s.setUnread);
  const clearUnread = useGeChatStore((s) => s.clearUnread);
  const readReceiptsEnabled = useGeChatStore((s) => s.privacy.readReceiptsEnabled);
  const hasTyping = typingUsers.some((id) => id !== currentUserId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    const last = messages[messages.length - 1];
    const tail = last ? (last.clientId ?? last.id) : null;
    if (!tail || tail === lastScrollTailRef.current) return;
    lastScrollTailRef.current = tail;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, hasTyping, editingId]);

  const startEdit = (message: Message) => {
    const parsed = parseMessageContent(message);
    if (parsed.kind !== 'text') return;
    setEditingId(message.id);
    setEditDraft(parsed.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = () => {
    if (!editingId || !editDraft.trim() || !onEditMessage) return;
    onEditMessage(editingId, editDraft.trim());
    cancelEdit();
  };

  const showMessageActions = (messageKey: string) => {
    if (hideActionsTimerRef.current) {
      clearTimeout(hideActionsTimerRef.current);
      hideActionsTimerRef.current = null;
    }
    setActiveActionsId(messageKey);
  };

  const scheduleHideMessageActions = () => {
    if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current);
    hideActionsTimerRef.current = setTimeout(() => {
      if (!actionsMenuLocked) setActiveActionsId(null);
      hideActionsTimerRef.current = null;
    }, 450);
  };

  useEffect(() => {
    return () => {
      if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current);
    };
  }, []);

  if (!messages.length && !hasTyping) {
    return (
      <ChatWallpaperBackground className="min-h-0 flex-1">
        <div className="flex h-0 min-h-0 flex-1 items-center justify-center p-8">
          <p className="max-w-xs text-center text-sm text-muted-foreground">
            Nenhuma mensagem. Envie a primeira!
          </p>
        </div>
      </ChatWallpaperBackground>
    );
  }

  return (
    <ChatWallpaperBackground className="min-h-0 flex-1">
      <div className="flex h-0 min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain p-4 pb-6 pt-2">
      {hasMore && onLoadMore && (
        <div className="flex justify-center py-3">
          <button
            type="button"
            onClick={onLoadMore}
            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            Carregar mensagens anteriores
          </button>
        </div>
      )}
      {messages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;
        const profile = memberProfiles[msg.senderId] ?? { name: 'Usuário' };
        const senderName = profile.name;
        const isEditing = editingId === msg.id;
        const canEdit = isOwn && isEditableMessage(msg) && onEditMessage;
        const preview = getMessagePlainText(msg);

        const handleQuote = () => {
          setReplyTo({
            messageId: msg.id,
            senderName,
            preview: preview.slice(0, 240),
          });
        };

        const handleForward = async () => {
          try {
            await navigator.clipboard.writeText(preview);
          } catch {
            /* ignore */
          }
        };

        const handleToggleRead = () => {
          if (isOwn) {
            setUnread(conversationId, 1);
            return;
          }
          clearUnread(conversationId);
          gechatSocket.markRead(conversationId);
        };

        const messageKey = msg.clientId ?? msg.id;
        const actionsVisible = activeActionsId === messageKey;

        return (
          <div
            key={msg.clientId ?? msg.id}
            className={cn('flex min-w-0 gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
          >
            {!isOwn && (
              <MessageAvatar profile={profile} onPress={() => setProfileUserId(msg.senderId)} />
            )}
            <div className={cn('flex max-w-[75%] flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
              <div
                className={cn(
                  'relative',
                  'z-0 hover:z-20 focus-within:z-20 has-[[data-state=open]]:z-20',
                  actionsVisible && 'z-20',
                )}
                onMouseEnter={() => showMessageActions(messageKey)}
                onMouseLeave={scheduleHideMessageActions}
                onFocusCapture={() => showMessageActions(messageKey)}
                onBlurCapture={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    scheduleHideMessageActions();
                  }
                }}
              >
                <div className="relative">
                <div
                  className={cn(
                    'relative z-10 rounded-2xl px-3 py-2 text-sm shadow-sm',
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >

                {!isOwn && (
                  <button
                    type="button"
                    onClick={() => setProfileUserId(msg.senderId)}
                    className="mb-0.5 text-left text-[10px] font-medium opacity-70 transition-opacity hover:opacity-100 hover:underline"
                  >
                    {senderName}
                  </button>
                )}

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={2}
                      className={cn(
                        'w-full min-w-[200px] resize-none rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={cancelEdit}>
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2"
                        onClick={saveEdit}
                        disabled={!editDraft.trim()}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <MessageBody message={msg} />
                )}

                {!isEditing && (
                  <div
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1 text-[10px]',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {msg.editedAt && <span className="italic opacity-80">editada</span>}
                    <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                    {isOwn && (
                      <StatusIcon
                        status={
                          !readReceiptsEnabled && msg.status === 'read' ? 'delivered' : msg.status
                        }
                      />
                    )}
                  </div>
                )}
                </div>

                {!isEditing && (
                  <MessageActionBar
                    message={msg}
                    isOwn={isOwn}
                    canEdit={!!canEdit}
                    alignEnd={isOwn}
                    visible={actionsVisible}
                    onMenuOpenChange={(open) => {
                      setActionsMenuLocked(open);
                      if (open) {
                        showMessageActions(messageKey);
                      } else {
                        scheduleHideMessageActions();
                      }
                    }}
                    onReact={(emoji) => onToggleReaction?.(msg.id, emoji)}
                    onQuote={handleQuote}
                    onForward={handleForward}
                    onToggleRead={handleToggleRead}
                    onDelete={isOwn && onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
                    onEdit={canEdit ? () => startEdit(msg) : undefined}
                    showDetails={isOwn && isGroupLike}
                    onShowDetails={() => setDetailsMessageId(msg.id)}
                  />
                )}
                </div>
              </div>

              {!isEditing && (
                <MessageReactions
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  alignEnd={isOwn}
                  showReactorNames={isGroupLike}
                  memberProfiles={memberProfiles}
                  onReact={(emoji) => onToggleReaction?.(msg.id, emoji)}
                />
              )}
            </div>
          </div>
        );
      })}

      <TypingBubble conversationId={conversationId} memberProfiles={memberProfiles} />

      <div ref={bottomRef} />
      </div>

      <MessageReadReceiptsDialog
        open={detailsMessageId !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsMessageId(null);
        }}
        conversationId={conversationId}
        messageId={detailsMessageId}
      />

      <GeChatProfilePopup
        userId={profileUserId}
        open={profileUserId !== null}
        onOpenChange={(open) => {
          if (!open) setProfileUserId(null);
        }}
      />
    </ChatWallpaperBackground>
  );
}
