import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MessageList } from '@/modules/gechat/components/MessageList';
import type { Conversation, Message } from '@/modules/gechat/types';
import { adminApi } from '@/admin/services/admin-api';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { useAuthStore } from '@/store/authStore';
import { LoadingGifScreen } from '@/components/LoadingGif';
import { cn } from '@/lib/utils';

type AdminConversationViewerDialogProps = {
  conversationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewTitle?: string;
};

function upsertMessage(list: Message[], message: Message): Message[] {
  const index = list.findIndex((m) => m.id === message.id);
  if (index === -1) return [...list, message];
  const next = [...list];
  next[index] = { ...next[index], ...message };
  return next;
}

function removeMessage(list: Message[], messageId: string): Message[] {
  return list.filter((m) => m.id !== messageId);
}

export function AdminConversationViewerDialog({
  conversationId,
  open,
  onOpenChange,
  previewTitle,
}: AdminConversationViewerDialogProps) {
  const adminUserId = useAuthStore((s) => s.user?.id ?? '');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<Array<{ id: string; name: string; avatar: string | null }>>(
    [],
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const memberProfiles = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    for (const m of members) {
      map[m.id] = { name: m.name, avatar: m.avatar ?? undefined };
    }
    return map;
  }, [members]);

  const title = conversation?.displayName ?? conversation?.name ?? previewTitle ?? 'Conversa';
  const initials = title
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const loadInitial = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [detail, messageData] = await Promise.all([
        adminApi.getConversationDetail(id),
        adminApi.getConversationMessages(id),
      ]);
      setConversation(detail.conversation);
      setMembers(detail.members);
      setMessages(messageData.messages);
      setNextCursor(messageData.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir conversa.');
      setConversation(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!conversationId || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      const data = await adminApi.getConversationMessages(conversationId, nextCursor);
      setMessages((prev) => [...data.messages, ...prev]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error('[admin viewer] loadMore:', err);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [conversationId, nextCursor]);

  useEffect(() => {
    if (!open || !conversationId) return;
    void loadInitial(conversationId);
  }, [open, conversationId, loadInitial]);

  useEffect(() => {
    if (!open || !conversationId) return;

    let cancelled = false;

    async function subscribeRealtime() {
      await gechatSocket.connect();
      if (cancelled || !conversationId) return;
      gechatSocket.joinConversation(conversationId);

      const unsubs = [
        gechatSocket.on('message:new', (raw) => {
          const message = raw as Message;
          if (message.conversationId !== conversationId) return;
          setMessages((prev) => upsertMessage(prev, message));
        }),
        gechatSocket.on('message:updated', (raw) => {
          const message = raw as Message;
          if (message.conversationId !== conversationId) return;
          setMessages((prev) => upsertMessage(prev, message));
        }),
        gechatSocket.on('message:deleted', (raw) => {
          const payload = raw as { conversationId?: string; messageId?: string };
          if (payload.conversationId !== conversationId || !payload.messageId) return;
          setMessages((prev) => removeMessage(prev, payload.messageId!));
        }),
        gechatSocket.on('reaction:updated', (raw) => {
          const payload = raw as {
            conversationId?: string;
            messageId?: string;
            reactions?: Message['reactions'];
          };
          if (payload.conversationId !== conversationId || !payload.messageId) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId ? { ...m, reactions: payload.reactions ?? [] } : m,
            ),
          );
        }),
      ];

      return () => {
        for (const unsub of unsubs) unsub();
      };
    }

    let cleanup: (() => void) | undefined;
    void subscribeRealtime().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [open, conversationId]);

  useEffect(() => {
    if (open) return;
    setConversation(null);
    setMembers([]);
    setMessages([]);
    setNextCursor(null);
    setError(null);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] w-[min(960px,96vw)] flex-col gap-0 overflow-hidden p-0"
        entranceStyle="subtle"
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 pr-12 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={conversation?.avatar} alt="" />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">{title}</DialogTitle>
              <DialogDescription className="truncate">
                Visualização em tempo real — somente leitura
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden bg-background">
          {loading ? (
            <LoadingGifScreen />
          ) : error ? (
            <p className="m-4 text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
              {error}
            </p>
          ) : conversation ? (
            <MessageList
              messages={messages}
              currentUserId={adminUserId}
              memberProfiles={memberProfiles}
              conversationId={conversation.id}
              isGroupLike={true}
              readOnly
              observerMode={true}
              hasMore={Boolean(nextCursor)}
              onLoadMore={loadMore}
            />
          ) : null}
        </div>

        <footer
          className={cn(
            'shrink-0 border-t border-border/60 bg-muted/30 px-4 py-2.5',
            'flex items-center justify-center gap-2 text-xs text-muted-foreground',
          )}
        >
          <Eye className="h-3.5 w-3.5" aria-hidden />
          Modo admin — você está observando esta conversa sem poder enviar mensagens.
        </footer>
      </DialogContent>
    </Dialog>
  );
}
