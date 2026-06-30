import { create } from 'zustand';
import type {
  ConnectionStatus,
  Conversation,
  MemberRole,
  Message,
  MessageStatus,
  PresenceState,
  PrivacySettings,
  ReplyQuote,
  UserProfile,
} from '@/modules/gechat/types';

export type InAppNotification = {
  id: string;
  conversationId: string;
  senderName: string;
  senderAvatar?: string;
  conversationName: string;
  isGroup: boolean;
  preview: string;
};

interface GeChatState {
  currentUser: UserProfile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesByConversation: Record<string, Message[]>;
  typingUsersByConversation: Record<string, string[]>;
  typingNamesByConversation: Record<string, Record<string, string>>;
  onlineUsers: Record<string, boolean>;
  presenceByUser: Record<string, PresenceState>;
  unreadCounters: Record<string, number>;
  connectionStatus: ConnectionStatus;
  membersByConversation: Record<string, UserProfile[]>;
  myGroupRoleByConversation: Record<string, MemberRole>;
  nextCursorByConversation: Record<string, string | null>;
  replyTo: ReplyQuote | null;
  privacy: PrivacySettings;
  inAppNotifications: InAppNotification[];

  setCurrentUser: (user: UserProfile | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConversations: (conversations: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, messages: Message[]) => void;
  mergeMessages: (conversationId: string, messages: Message[]) => void;
  upsertMessage: (conversationId: string, message: Message) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus, clientId?: string) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<Message>) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean, userName?: string) => void;
  setPresence: (userId: string, state: Partial<PresenceState>) => void;
  setUnread: (conversationId: string, count: number) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  patchConversationLastMessageStatus: (
    conversationId: string,
    status: MessageStatus,
    messageId?: string,
  ) => void;
  setMembers: (conversationId: string, members: UserProfile[]) => void;
  setMyGroupRole: (conversationId: string, role: MemberRole | null) => void;
  setNextCursor: (conversationId: string, cursor: string | null) => void;
  setReplyTo: (quote: ReplyQuote | null) => void;
  setPrivacy: (privacy: PrivacySettings) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  pushInAppNotification: (n: Omit<InAppNotification, 'id'>) => void;
  dismissInAppNotification: (id: string) => void;
  reset: () => void;
}

const initialState = {
  currentUser: null as UserProfile | null,
  conversations: [] as Conversation[],
  activeConversationId: null as string | null,
  messagesByConversation: {} as Record<string, Message[]>,
  typingUsersByConversation: {} as Record<string, string[]>,
  typingNamesByConversation: {} as Record<string, Record<string, string>>,
  onlineUsers: {} as Record<string, boolean>,
  presenceByUser: {} as Record<string, PresenceState>,
  unreadCounters: {} as Record<string, number>,
  connectionStatus: 'disconnected' as ConnectionStatus,
  membersByConversation: {} as Record<string, UserProfile[]>,
  myGroupRoleByConversation: {} as Record<string, MemberRole>,
  nextCursorByConversation: {} as Record<string, string | null>,
  replyTo: null as ReplyQuote | null,
  privacy: {
    readReceiptsEnabled: true,
    lastSeenVisible: true,
  } as PrivacySettings,
  inAppNotifications: [] as InAppNotification[],
};

function sortMessages(messages: Message[]) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

const STATUS_RANK: Record<Message['status'], number> = {
  failed: -1,
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

function pickStatus(a?: Message['status'], b?: Message['status']): Message['status'] {
  const rank = (s?: Message['status']) => STATUS_RANK[s ?? 'sent'] ?? 1;
  return rank(a) >= rank(b) ? (a ?? 'sent') : (b ?? 'sent');
}

function messageDedupeKey(msg: Message): string {
  if (msg.clientId) return `client:${msg.clientId}`;
  return `id:${msg.id}`;
}

function findDuplicateKey(byKey: Map<string, Message>, msg: Message): string | undefined {
  for (const [key, existing] of byKey.entries()) {
    if (
      existing.id === msg.id ||
      (msg.clientId && existing.clientId === msg.clientId) ||
      (msg.id && !msg.id.startsWith('temp-') && existing.id === msg.id)
    ) {
      return key;
    }
  }
  return undefined;
}

function dedupeMessages(messages: Message[]) {
  const byKey = new Map<string, Message>();
  for (const msg of messages) {
    const duplicateKey = findDuplicateKey(byKey, msg);
    const existing = duplicateKey ? byKey.get(duplicateKey) : undefined;
    if (duplicateKey) byKey.delete(duplicateKey);

    const merged: Message = {
      ...existing,
      ...msg,
      clientId: msg.clientId ?? existing?.clientId,
      status: pickStatus(msg.status, existing?.status),
    };
    const key =
      merged.id.startsWith('temp-') && merged.clientId
        ? `client:${merged.clientId}`
        : messageDedupeKey(merged);
    byKey.set(key, merged);
  }
  return sortMessages([...byKey.values()]);
}

export const useGeChatStore = create<GeChatState>((set, get) => ({
  ...initialState,

  setCurrentUser: (user) => set({ currentUser: user }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setConversations: (conversations) => {
    const unreadCounters: Record<string, number> = {};
    for (const c of conversations) {
      unreadCounters[c.id] = c.unreadCount ?? 0;
    }
    set({ conversations, unreadCounters });
  },

  upsertConversation: (conversation) => {
    const list = get().conversations;
    const idx = list.findIndex((c) => c.id === conversation.id);
    const activeId = get().activeConversationId;
    // Prefer the local counter — socket `conversation:updated` carries the
    // sender's view of unreadCount (always 0), which must not overwrite our
    // correctly-incremented in-memory counter.
    const mergedUnread =
      conversation.id === activeId
        ? 0
        : get().unreadCounters[conversation.id] ?? conversation.unreadCount ?? 0;

    const next =
      idx >= 0
        ? list.map((c, i) =>
            i === idx ? { ...c, ...conversation, unreadCount: mergedUnread } : c,
          )
        : [{ ...conversation, unreadCount: mergedUnread }, ...list];
    set({
      conversations: next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
      unreadCounters: {
        ...get().unreadCounters,
        [conversation.id]: mergedUnread,
      },
    });
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: dedupeMessages(messages),
      },
    }),

  mergeMessages: (conversationId, messages) => {
    const existing = get().messagesByConversation[conversationId] ?? [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: dedupeMessages([...existing, ...messages]),
      },
    });
  },

  upsertMessage: (conversationId, message) => {
    const existing = get().messagesByConversation[conversationId] ?? [];
    const activeId = get().activeConversationId;
    const currentUserId = get().currentUser?.id;
    const next = dedupeMessages([...existing, message]);

    if (message.senderId !== currentUserId && conversationId !== activeId) {
      get().incrementUnread(conversationId);
    }
    // Só limpa unread localmente se o usuário está realmente vendo a conversa.
    // Se a aba estiver oculta, mantém o badge até ele voltar à tela.
    if (conversationId === activeId && message.senderId !== currentUserId && !document.hidden) {
      get().clearUnread(conversationId);
    }

    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: next,
      },
    });
  },

  updateMessageStatus: (conversationId, messageId, status, clientId) => {
    const messages = get().messagesByConversation[conversationId] ?? [];
    const updated = messages.map((m) => {
      if (m.id === messageId || (clientId && m.clientId === clientId)) {
        return {
          ...m,
          id: m.id.startsWith('temp-') ? messageId : m.id,
          status,
          clientId: clientId ?? m.clientId,
        };
      }
      return m;
    });
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: dedupeMessages(updated),
      },
    });
  },

  updateMessage: (conversationId, messageId, patch) => {
    const messages = get().messagesByConversation[conversationId] ?? [];
    const updated = messages.map((m) =>
      m.id === messageId || (patch.clientId && m.clientId === patch.clientId)
        ? { ...m, ...patch, id: m.id.startsWith('temp-') && patch.id ? patch.id : messageId }
        : m,
    );
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: dedupeMessages(updated),
      },
    });
  },

  setTyping: (conversationId, userId, isTyping, userName) => {
    const current = get().typingUsersByConversation[conversationId] ?? [];
    const names = { ...(get().typingNamesByConversation[conversationId] ?? {}) };

    if (isTyping) {
      if (userName) names[userId] = userName;
    } else {
      delete names[userId];
    }

    const nextUsers = isTyping
      ? [...new Set([...current, userId])]
      : current.filter((id) => id !== userId);

    set({
      typingUsersByConversation: {
        ...get().typingUsersByConversation,
        [conversationId]: nextUsers,
      },
      typingNamesByConversation: {
        ...get().typingNamesByConversation,
        [conversationId]: names,
      },
    });
  },

  setPresence: (userId, state) =>
    set({
      onlineUsers: {
        ...get().onlineUsers,
        [userId]: state.online ?? get().onlineUsers[userId] ?? false,
      },
      presenceByUser: {
        ...get().presenceByUser,
        [userId]: { ...get().presenceByUser[userId], userId, ...state },
      },
    }),

  setUnread: (conversationId, count) =>
    set({
      unreadCounters: { ...get().unreadCounters, [conversationId]: count },
      conversations: get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: count } : c,
      ),
    }),

  incrementUnread: (conversationId) => {
    const next = (get().unreadCounters[conversationId] ?? 0) + 1;
    set({
      unreadCounters: { ...get().unreadCounters, [conversationId]: next },
      conversations: get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: next } : c,
      ),
    });
  },

  clearUnread: (conversationId) =>
    set({
      unreadCounters: { ...get().unreadCounters, [conversationId]: 0 },
      conversations: get().conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }),

  patchConversationLastMessageStatus: (conversationId, status, messageId) => {
    const currentUserId = get().currentUser?.id;
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv?.lastMessage) return;
    if (conv.lastMessage.senderId !== currentUserId) return;
    if (messageId && conv.lastMessage.id !== messageId) return;

    get().upsertConversation({
      ...conv,
      lastMessage: { ...conv.lastMessage, status },
    });
  },

  setMembers: (conversationId, members) =>
    set({
      membersByConversation: {
        ...get().membersByConversation,
        [conversationId]: members,
      },
    }),

  setMyGroupRole: (conversationId, role) =>
    set({
      myGroupRoleByConversation: role
        ? { ...get().myGroupRoleByConversation, [conversationId]: role }
        : Object.fromEntries(
            Object.entries(get().myGroupRoleByConversation).filter(([id]) => id !== conversationId),
          ),
    }),

  setNextCursor: (conversationId, cursor) =>
    set({
      nextCursorByConversation: {
        ...get().nextCursorByConversation,
        [conversationId]: cursor,
      },
    }),

  setReplyTo: (quote) => set({ replyTo: quote }),

  setPrivacy: (privacy) => set({ privacy }),

  removeMessage: (conversationId, messageId) => {
    const messages = get().messagesByConversation[conversationId] ?? [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: messages.filter((m) => m.id !== messageId),
      },
    });
  },

  pushInAppNotification: (n) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const current = get().inAppNotifications;
    set({ inAppNotifications: [...current.slice(-4), { ...n, id }] });
  },

  dismissInAppNotification: (id) =>
    set({ inAppNotifications: get().inAppNotifications.filter((n) => n.id !== id) }),

  reset: () => set({ ...initialState }),
}));
