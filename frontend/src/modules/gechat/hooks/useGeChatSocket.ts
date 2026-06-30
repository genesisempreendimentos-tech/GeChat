import { useEffect, useRef } from 'react';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { useGeChatStore } from '@/store/gechatStore';
import type { Conversation, Message, PresenceState } from '@/modules/gechat/types';
import {
  canShowBrowserNotifications,
  playNotificationSound,
  showBrowserNotification,
} from '../services/gechat-notifications';

function getNotificationPreview(content: string, type: Message['type']): string {
  if (type === 'audio') return '🎵 Áudio';
  const nonQuote = content
    .split('\n')
    .filter((l) => !l.startsWith('>'))
    .join(' ')
    .trim();
  return (nonQuote || content).slice(0, 120);
}

export function useGeChatSocket(enabled = true) {
  const store = useGeChatStore;
  const initialized = useRef(false);

  useEffect(() => {
    if (!enabled || initialized.current) return;
    initialized.current = true;

    const unsubscribers: Array<() => void> = [];
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    store.getState().setConnectionStatus('connecting');

    async function tryConnect() {
      const s = await gechatSocket.connect();
      if (!s) {
        store.getState().setConnectionStatus('error');
        retryTimer = setTimeout(tryConnect, 5000);
        return;
      }
      if (s.connected) store.getState().setConnectionStatus('connected');
    }
    void tryConnect();

    unsubscribers.push(
      gechatSocket.on('connect', () => store.getState().setConnectionStatus('connected')),
    );
    unsubscribers.push(
      gechatSocket.on('disconnect', () => store.getState().setConnectionStatus('disconnected')),
    );
    unsubscribers.push(
      gechatSocket.on('connect_error', () => store.getState().setConnectionStatus('error')),
    );

    unsubscribers.push(
      gechatSocket.on('message:new', (raw) => {
        const message = raw as Message & { senderName?: string; senderAvatar?: string };
        store.getState().upsertMessage(message.conversationId, message);
        const state = store.getState();
        const convs = state.conversations;
        const conv = convs.find((c) => c.id === message.conversationId);
        if (conv) {
          state.upsertConversation({
            ...conv,
            lastMessage: {
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              createdAt: message.createdAt,
              type: message.type,
              status: message.status,
            },
            updatedAt: message.createdAt,
          });
        }

        // Notificações: somente para mensagens de outros usuários em conversas não ativas
        const currentUserId = state.currentUser?.id;
        const activeId = state.activeConversationId;
        if (message.senderId !== currentUserId && message.conversationId !== activeId) {
          const members = state.membersByConversation[message.conversationId] ?? [];
          const sender = members.find((m) => m.id === message.senderId);

          // Cascata: (1) nome embutido no evento pelo backend, (2) perfil já carregado
          // em membersByConversation, (3) nome da conversa direta (= nome da outra pessoa).
          const isGroup = conv ? conv.type !== 'direct' : false;
          const senderName =
            message.senderName ??
            sender?.name ??
            (!isGroup ? (conv?.displayName ?? conv?.name) : null) ??
            'Alguém';
          const senderAvatar =
            message.senderAvatar ?? sender?.avatar ?? (!isGroup ? conv?.avatar : undefined);

          const preview = getNotificationPreview(message.content, message.type);

          if (canShowBrowserNotifications()) {
            // Permissão concedida: notificação nativa sempre (aba ativa ou não),
            // igual ao comportamento do WhatsApp Web.
            void showBrowserNotification({
              title: isGroup ? (conv?.name ?? 'Grupo') : senderName,
              body: isGroup ? `${senderName}: ${preview}` : preview,
              icon: senderAvatar,
              conversationId: message.conversationId,
            });
            playNotificationSound();
          } else {
            // Sem permissão nativa: toast in-app + som como fallback.
            playNotificationSound();
            state.pushInAppNotification({
              conversationId: message.conversationId,
              senderName,
              senderAvatar,
              conversationName: conv?.name ?? senderName,
              isGroup,
              preview,
            });
          }
        }
      }),
    );

    unsubscribers.push(
      gechatSocket.on('message:updated', (raw) => {
        const message = raw as Message;
        store.getState().updateMessage(message.conversationId, message.id, message);
        const convs = store.getState().conversations;
        const conv = convs.find((c) => c.id === message.conversationId);
        if (conv?.lastMessage?.id === message.id) {
          store.getState().upsertConversation({
            ...conv,
            lastMessage: {
              ...conv.lastMessage,
              content: message.content,
            },
            updatedAt: message.editedAt ?? message.updatedAt ?? conv.updatedAt,
          });
        }
      }),
    );

    unsubscribers.push(
      gechatSocket.on('message:deleted', (raw) => {
        const data = raw as { messageId: string; conversationId: string };
        store.getState().removeMessage(data.conversationId, data.messageId);
      }),
    );

    unsubscribers.push(
      gechatSocket.on('reaction:updated', (raw) => {
        const data = raw as {
          messageId: string;
          conversationId: string;
          reactions: Message['reactions'];
        };
        store.getState().updateMessage(data.conversationId, data.messageId, {
          reactions: data.reactions ?? [],
        });
      }),
    );

    unsubscribers.push(
      gechatSocket.on('message:sent', (raw) => {
        const data = raw as { messageId: string; clientId?: string; status: Message['status']; conversationId: string };
        if (!data.conversationId) return;
        store.getState().updateMessageStatus(data.conversationId, data.messageId, data.status, data.clientId);
        store.getState().patchConversationLastMessageStatus(data.conversationId, data.status, data.messageId);
      }),
    );

    unsubscribers.push(
      gechatSocket.on('message:delivered', (raw) => {
        const data = raw as { messageId: string; conversationId: string };
        store.getState().updateMessageStatus(data.conversationId, data.messageId, 'delivered');
        store.getState().patchConversationLastMessageStatus(
          data.conversationId,
          'delivered',
          data.messageId,
        );
      }),
    );

    unsubscribers.push(
      gechatSocket.on('message:read', (raw) => {
        if (!store.getState().privacy.readReceiptsEnabled) return;
        const data = raw as { conversationId: string };
        const messages = store.getState().messagesByConversation[data.conversationId] ?? [];
        const currentUserId = store.getState().currentUser?.id;
        for (const m of messages) {
          if (m.senderId === currentUserId && m.status !== 'read') {
            store.getState().updateMessageStatus(data.conversationId, m.id, 'read');
          }
        }
        const conv = store.getState().conversations.find((c) => c.id === data.conversationId);
        if (conv?.lastMessage?.senderId === currentUserId) {
          store.getState().patchConversationLastMessageStatus(data.conversationId, 'read');
        }
      }),
    );

    unsubscribers.push(
      gechatSocket.on('typing:start', (raw) => {
        const data = raw as { conversationId: string; userId: string; userName?: string };
        store.getState().setTyping(
          data.conversationId,
          data.userId,
          true,
          data.userName,
        );
      }),
    );

    unsubscribers.push(
      gechatSocket.on('typing:stop', (raw) => {
        const data = raw as { conversationId: string; userId: string };
        store.getState().setTyping(data.conversationId, data.userId, false);
      }),
    );

    unsubscribers.push(
      gechatSocket.on('presence:online', (raw) => {
        const data = raw as { userId: string };
        store.getState().setPresence(data.userId, { online: true });
      }),
    );

    unsubscribers.push(
      gechatSocket.on('presence:offline', (raw) => {
        const data = raw as { userId: string };
        store.getState().setPresence(data.userId, { online: false });
      }),
    );

    unsubscribers.push(
      gechatSocket.on('presence:update', (raw) => {
        const data = raw as Record<string, PresenceState>;
        for (const [userId, state] of Object.entries(data)) {
          store.getState().setPresence(userId, state);
        }
      }),
    );

    unsubscribers.push(
      gechatSocket.on('conversation:updated', (raw) => {
        store.getState().upsertConversation(raw as Conversation);
      }),
    );

    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      unsubscribers.forEach((fn) => fn());
      gechatSocket.disconnect();
      initialized.current = false;
      store.getState().reset();
    };
  }, [enabled]);
}
