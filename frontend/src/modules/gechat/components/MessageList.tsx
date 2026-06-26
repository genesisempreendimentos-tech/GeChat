import { format } from 'date-fns';
import { Check, CheckCheck, ExternalLink, FileText, Pin, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { MessageActionBar } from '@/modules/gechat/components/MessageActionBar';
import { MessageReactions } from '@/modules/gechat/components/MessageReactions';
import { useGeChatStore } from '@/store/gechatStore';
import type { Message } from '@/modules/gechat/types';
import {
  getMessagePlainText,
  isEditableMessage,
  parseMessageContent,
  renderFormattedText,
} from '@/modules/gechat/lib/message-content';
function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function StatusIcon({ status }: { status: Message['status'] }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-primary-foreground/90" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 opacity-70" />;
  if (status === 'sent') return <Check className="h-3 w-3 opacity-70" />;
  if (status === 'failed') return <span className="text-[10px] text-destructive">!</span>;
  return <Check className="h-3 w-3 opacity-40" />;
}

export type MemberProfile = {
  name: string;
  avatar?: string;
};

function MessageAvatar({ profile }: { profile: MemberProfile }) {
  return (
    <Avatar className="mt-1 h-7 w-7 shrink-0">
      <AvatarImage src={profile.avatar} alt={profile.name} />
      <AvatarFallback className="text-[10px]">{initials(profile.name)}</AvatarFallback>
    </Avatar>
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70"
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{
            repeat: Infinity,
            duration: 0.85,
            delay: i * 0.14,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function TypingBubble({
  conversationId,
  memberProfiles,
}: {
  conversationId: string;
  memberProfiles: Record<string, MemberProfile>;
}) {
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversationId] ?? []);
  const currentUserId = useGeChatStore((s) => s.currentUser?.id);
  const members = useGeChatStore((s) => s.membersByConversation[conversationId] ?? []);

  const others = typingUsers.filter((id) => id !== currentUserId);
  if (!others.length) return null;

  const typerId = others[0];
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
      aria-label={`${profile.name} está digitando`}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      >
        <MessageAvatar profile={profile} />
      </motion.div>
      <div className="rounded-2xl bg-muted px-3.5 py-2.5 shadow-sm">
        <TypingDots />
      </div>
    </motion.div>
  );
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  memberProfiles: Record<string, MemberProfile>;
  conversationId: string;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  memberProfiles,
  conversationId,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingUsers = useGeChatStore((s) => s.typingUsersByConversation[conversationId] ?? []);
  const starred = useGeChatStore((s) => s.starredByConversation[conversationId] ?? []);
  const pinned = useGeChatStore((s) => s.pinnedByConversation[conversationId] ?? []);
  const toggleStar = useGeChatStore((s) => s.toggleStar);
  const togglePin = useGeChatStore((s) => s.togglePin);
  const setReplyTo = useGeChatStore((s) => s.setReplyTo);
  const setUnread = useGeChatStore((s) => s.setUnread);
  const clearUnread = useGeChatStore((s) => s.clearUnread);
  const readReceiptsEnabled = useGeChatStore((s) => s.privacy.readReceiptsEnabled);
  const hasTyping = typingUsers.some((id) => id !== currentUserId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, messages[messages.length - 1]?.id, hasTyping, editingId]);

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

  if (!messages.length && !hasTyping) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        Nenhuma mensagem. Envie a primeira!
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;
        const profile = memberProfiles[msg.senderId] ?? { name: 'Usuário' };
        const senderName = profile.name;
        const isEditing = editingId === msg.id;
        const canEdit = isOwn && isEditableMessage(msg) && onEditMessage;
        const isStarred = starred.includes(msg.id);
        const isPinned = pinned.includes(msg.id);
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

        return (
          <div
            key={msg.clientId ?? msg.id}
            className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
          >
            {!isOwn && <MessageAvatar profile={profile} />}
            <div className={cn('flex max-w-[75%] flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
              <div className="group/message relative">
                {!isEditing && (
                  <MessageActionBar
                    message={msg}
                    isOwn={isOwn}
                    isStarred={isStarred}
                    isPinned={isPinned}
                    canEdit={!!canEdit}
                    alignEnd={isOwn}
                    onReact={(emoji) => onToggleReaction?.(msg.id, emoji)}
                    onQuote={handleQuote}
                    onForward={handleForward}
                    onToggleRead={handleToggleRead}
                    onToggleStar={() => toggleStar(conversationId, msg.id)}
                    onTogglePin={() => togglePin(conversationId, msg.id)}
                    onDelete={isOwn && onDeleteMessage ? () => onDeleteMessage(msg.id) : undefined}
                    onEdit={canEdit ? () => startEdit(msg) : undefined}
                  />
                )}

                <div
                  className={cn(
                    'relative rounded-2xl px-3 py-2 text-sm shadow-sm',
                    isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                    isStarred && 'ring-1 ring-amber-400/40',
                    isPinned && 'ring-1 ring-primary/30',
                  )}
                >
                {(isStarred || isPinned) && (
                  <div
                    className={cn(
                      'mb-1 flex items-center gap-2 text-[10px] opacity-70',
                      isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {isStarred && (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-current text-amber-400" />
                        Estrela
                      </span>
                    )}
                    {isPinned && (
                      <span className="inline-flex items-center gap-0.5">
                        <Pin className="h-3 w-3" />
                        Fixada
                      </span>
                    )}
                  </div>
                )}

                {!isOwn && (
                  <p className="mb-0.5 text-[10px] font-medium opacity-70">{senderName}</p>
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
              </div>

              {!isEditing && (
                <MessageReactions
                  reactions={msg.reactions}
                  currentUserId={currentUserId}
                  alignEnd={isOwn}
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
  );
}
