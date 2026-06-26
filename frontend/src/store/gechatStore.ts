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

interface GeChatState {
  currentUser: UserProfile | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  messagesByConversation: Record<string, Message[]>;
  typingUsersByConversation: Record<string, string[]>;
  onlineUsers: Record<string, boolean>;
  presenceByUser: Record<string, PresenceState>;
  unreadCounters: Record<string, number>;
  connectionStatus: ConnectionStatus;
  membersByConversation: Record<string, UserProfile[]>;
  myGroupRoleByConversation: Record<string, MemberRole>;
  starredByConversation: Record<string, string[]>;
  pinnedByConversation: Record<string, string[]>;
  replyTo: ReplyQuote | null;
  privacy: PrivacySettings;

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
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setPresence: (userId: string, state: Partial<PresenceState>) => void;
  setUnread: (conversationId: string, count: number) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setMembers: (conversationId: string, members: UserProfile[]) => void;
  setMyGroupRole: (conversationId: string, role: MemberRole | null) => void;
  toggleStar: (conversationId: string, messageId: string) => void;
  togglePin: (conversationId: string, messageId: string) => void;
  setReplyTo: (quote: ReplyQuote | null) => void;
  setPrivacy: (privacy: PrivacySettings) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  reset: () => void;
}

const initialState = {
  currentUser: null as UserProfile | null,
  conversations: [] as Conversation[],
  activeConversationId: null as string | null,
  messagesByConversation: {} as Record<string, Message[]>,
  typingUsersByConversation: {} as Record<string, string[]>,
  onlineUsers: {} as Record<string, boolean>,
  presenceByUser: {} as Record<string, PresenceState>,
  unreadCounters: {} as Record<string, number>,
  connectionStatus: 'disconnected' as ConnectionStatus,
  membersByConversation: {} as Record<string, UserProfile[]>,
  myGroupRoleByConversation: {} as Record<string, MemberRole>,
  starredByConversation: {} as Record<string, string[]>,
  pinnedByConversation: {} as Record<string, string[]>,
  replyTo: null as ReplyQuote | null,
  privacy: {
    readReceiptsEnabled: true,
    lastSeenVisible: true,
  } as PrivacySettings,
};

function sortMessages(messages: Message[]) {
  return [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function dedupeMessages(messages: Message[]) {
  const byId = new Map<string, Message>();
  for (const msg of messages) {
    const existing = [...byId.values()].find(
      (m) => m.id === msg.id || (msg.clientId && m.clientId === msg.clientId),
    );
    if (existing) byId.delete(existing.id);
    byId.set(msg.id.startsWith('temp-') && msg.clientId ? msg.clientId : msg.id, { ...existing, ...msg });
  }
  return sortMessages([...byId.values()]);
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
    const next =
      idx >= 0
        ? list.map((c, i) => (i === idx ? { ...c, ...conversation } : c))
        : [conversation, ...list];
    set({
      conversations: next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
      unreadCounters: {
        ...get().unreadCounters,
        [conversation.id]: conversation.unreadCount ?? get().unreadCounters[conversation.id] ?? 0,
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
    if (conversationId === activeId && message.senderId !== currentUserId) {
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
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: messages.map((m) => {
          if (m.id === messageId || (clientId && m.clientId === clientId)) {
            return { ...m, id: messageId, status, clientId: clientId ?? m.clientId };
          }
          return m;
        }),
      },
    });
  },

  updateMessage: (conversationId, messageId, patch) => {
    const messages = get().messagesByConversation[conversationId] ?? [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: messages.map((m) =>
          m.id === messageId || (patch.clientId && m.clientId === patch.clientId)
            ? { ...m, ...patch, id: messageId }
            : m,
        ),
      },
    });
  },

  setTyping: (conversationId, userId, isTyping) => {
    const current = get().typingUsersByConversation[conversationId] ?? [];
    const next = isTyping
      ? [...new Set([...current, userId])]
      : current.filter((id) => id !== userId);
    set({
      typingUsersByConversation: {
        ...get().typingUsersByConversation,
        [conversationId]: next,
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
    set({ unreadCounters: { ...get().unreadCounters, [conversationId]: count } }),

  incrementUnread: (conversationId) =>
    set({
      unreadCounters: {
        ...get().unreadCounters,
        [conversationId]: (get().unreadCounters[conversationId] ?? 0) + 1,
      },
    }),

  clearUnread: (conversationId) =>
    set({ unreadCounters: { ...get().unreadCounters, [conversationId]: 0 } }),

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

  toggleStar: (conversationId, messageId) => {
    const current = get().starredByConversation[conversationId] ?? [];
    const next = current.includes(messageId)
      ? current.filter((id) => id !== messageId)
      : [...current, messageId];
    set({
      starredByConversation: {
        ...get().starredByConversation,
        [conversationId]: next,
      },
    });
  },

  togglePin: (conversationId, messageId) => {
    const current = get().pinnedByConversation[conversationId] ?? [];
    const next = current.includes(messageId)
      ? current.filter((id) => id !== messageId)
      : [...current, messageId];
    set({
      pinnedByConversation: {
        ...get().pinnedByConversation,
        [conversationId]: next,
      },
    });
  },

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

  reset: () => set({ ...initialState }),
}));
