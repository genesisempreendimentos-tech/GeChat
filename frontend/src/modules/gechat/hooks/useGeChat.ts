import { useCallback, useEffect, useRef } from 'react';
import { gechatApi } from '@/modules/gechat/services/gechat-api';
import { gechatSocket } from '@/lib/realtime/socket-client';
import { buildQuotedReplyContent } from '@/modules/gechat/lib/message-content';
import { useGeChatStore } from '@/store/gechatStore';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type { MemberRole, Message, MessageReaction, MessageType } from '@/modules/gechat/types';

export function useGeChatBootstrap() {
  const { user } = useAuthStore();
  const { setCurrentUser, setConversations, setPresence, setPrivacy } = useGeChatStore();

  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      });
    }
  }, [user, setCurrentUser]);

  const loadConversations = useCallback(async () => {
    const list = await gechatApi.getConversations();
    setConversations(list);

    const presenceIds = list
      .filter((c) => c.type === 'direct' && c.otherMemberId)
      .map((c) => c.otherMemberId as string);
    if (presenceIds.length) {
      const presence = await gechatApi.getPresence(presenceIds);
      for (const [id, state] of Object.entries(presence)) {
        setPresence(id, state);
      }
    }
  }, [setConversations, setPresence]);

  useEffect(() => {
    loadConversations().catch(console.error);
    gechatApi.getPrivacy().then(setPrivacy).catch(console.error);
  }, [loadConversations, setPrivacy]);

  return { loadConversations };
}

export function useGeChat() {
  const { user } = useAuthStore();
  const {
    conversations,
    activeConversationId,
    messagesByConversation,
    setActiveConversation,
    setMessages,
    mergeMessages,
    clearUnread,
    setMembers,
    setMyGroupRole,
  } = useGeChatStore();

  const loadingByConversation = useRef<Record<string, boolean>>({});

  const loadConversations = useCallback(async () => {
    const list = await gechatApi.getConversations();
    useGeChatStore.getState().setConversations(list);

    const presenceIds = list
      .filter((c) => c.type === 'direct' && c.otherMemberId)
      .map((c) => c.otherMemberId as string);
    if (presenceIds.length) {
      const presence = await gechatApi.getPresence(presenceIds);
      for (const [id, state] of Object.entries(presence)) {
        useGeChatStore.getState().setPresence(id, state);
      }
    }
  }, []);

  const openConversation = useCallback(
    async (conversationId: string) => {
      setActiveConversation(conversationId);
      clearUnread(conversationId);
      gechatSocket.joinConversation(conversationId);
      gechatSocket.markRead(conversationId);

      const hasCachedMessages = Boolean(
        useGeChatStore.getState().messagesByConversation[conversationId]?.length,
      );

      if (!hasCachedMessages && !loadingByConversation.current[conversationId]) {
        loadingByConversation.current[conversationId] = true;
        try {
          const { messages } = await gechatApi.getMessages(conversationId);
          const current =
            useGeChatStore.getState().messagesByConversation[conversationId] ?? [];
          if (current.length === 0) {
            setMessages(conversationId, messages);
          } else {
            mergeMessages(conversationId, messages);
          }
        } finally {
          loadingByConversation.current[conversationId] = false;
        }
      }

      try {
        const { members } = await gechatApi.getMembers(conversationId);
        setMembers(
          conversationId,
          members.map((m) => m.profile ?? { id: m.userId, name: 'Usuário' }),
        );
        const myMember = members.find((m) => m.userId === user?.id);
        if (myMember?.role) {
          setMyGroupRole(conversationId, myMember.role as MemberRole);
        }
      } catch {
        /* optional */
      }
    },
    [setActiveConversation, clearUnread, setMessages, mergeMessages, setMembers, setMyGroupRole, user?.id],
  );

  const sendMessage = useCallback(
    async (content: string, type: MessageType = 'text') => {
      if (!activeConversationId || !user) return;

      const replyTo = useGeChatStore.getState().replyTo;
      const finalContent =
        replyTo && type === 'text'
          ? buildQuotedReplyContent(replyTo, content)
          : content;

      if (replyTo) {
        useGeChatStore.getState().setReplyTo(null);
      }

      const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: `temp-${clientId}`,
        conversationId: activeConversationId,
        senderId: user.id,
        content: finalContent,
        type,
        status: 'sending',
        createdAt: new Date().toISOString(),
        clientId,
      };
      useGeChatStore.getState().upsertMessage(activeConversationId, optimistic);

      const result = await gechatSocket.sendMessage({
        conversationId: activeConversationId,
        content: finalContent,
        type,
        clientId,
      });

      if (!result.ok) {
        useGeChatStore.getState().updateMessageStatus(activeConversationId, optimistic.id, 'failed', clientId);
        toast.error(result.error ?? 'Não foi possível enviar a mensagem.');
      } else if (result.message) {
        useGeChatStore.getState().upsertMessage(activeConversationId, {
          ...result.message,
          clientId,
          status: 'sent',
        });
      }
    },
    [activeConversationId, user],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!activeConversationId) return;
      const previous = useGeChatStore
        .getState()
        .messagesByConversation[activeConversationId]?.find((m) => m.id === messageId);

      const optimisticEditedAt = new Date().toISOString();
      useGeChatStore.getState().updateMessage(activeConversationId, messageId, {
        content,
        editedAt: optimisticEditedAt,
      });

      const socketResult = await gechatSocket.editMessage({
        conversationId: activeConversationId,
        messageId,
        content,
      });

      if (socketResult.ok && socketResult.message) {
        useGeChatStore.getState().updateMessage(activeConversationId, messageId, socketResult.message);
        return;
      }

      try {
        const message = await gechatApi.editMessage(activeConversationId, messageId, content);
        useGeChatStore.getState().updateMessage(activeConversationId, messageId, message);
      } catch (err) {
        console.error(err);
        if (previous) {
          useGeChatStore.getState().updateMessage(activeConversationId, messageId, previous);
        }
      }
    },
    [activeConversationId],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!activeConversationId) return;

      useGeChatStore.getState().removeMessage(activeConversationId, messageId);

      const socketResult = await gechatSocket.deleteMessage({
        conversationId: activeConversationId,
        messageId,
      });

      if (socketResult.ok) return;

      try {
        await gechatApi.deleteMessage(activeConversationId, messageId);
      } catch (err) {
        console.error(err);
        const { messages } = await gechatApi.getMessages(activeConversationId);
        useGeChatStore.getState().setMessages(activeConversationId, messages);
      }
    },
    [activeConversationId],
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!activeConversationId || !user) return;

      const messages = useGeChatStore.getState().messagesByConversation[activeConversationId] ?? [];
      const msg = messages.find((m) => m.id === messageId);
      if (!msg) return;

      const previous = msg.reactions ?? [];
      const mine = previous.find((r) => r.userId === user.id);
      let optimistic: MessageReaction[];

      if (mine?.emoji === emoji) {
        optimistic = previous.filter((r) => r.userId !== user.id);
      } else if (mine) {
        optimistic = previous.map((r) =>
          r.userId === user.id ? { ...r, emoji } : r,
        );
      } else {
        optimistic = [
          ...previous,
          { userId: user.id, emoji, createdAt: new Date().toISOString() },
        ];
      }

      useGeChatStore.getState().updateMessage(activeConversationId, messageId, {
        reactions: optimistic,
      });

      const socketResult = await gechatSocket.toggleReaction({
        conversationId: activeConversationId,
        messageId,
        emoji,
      });

      if (socketResult.ok && socketResult.reactions) {
        useGeChatStore.getState().updateMessage(activeConversationId, messageId, {
          reactions: socketResult.reactions,
        });
        return;
      }

      try {
        const result = await gechatApi.toggleReaction(activeConversationId, messageId, emoji);
        useGeChatStore.getState().updateMessage(activeConversationId, messageId, {
          reactions: result.reactions,
        });
      } catch (err) {
        console.error(err);
        useGeChatStore.getState().updateMessage(activeConversationId, messageId, {
          reactions: previous,
        });
      }
    },
    [activeConversationId, user],
  );

  const createDirect = useCallback(
    async (targetUserId: string) => {
      const conv = await gechatApi.createDirect(targetUserId);
      useGeChatStore.getState().upsertConversation(conv);
      await openConversation(conv.id);
      return conv;
    },
    [openConversation],
  );

  return {
    conversations,
    activeConversationId,
    messages: activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [],
    loadConversations,
    openConversation,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    createDirect,
  };
}
