import type {
  ChannelSubtype,
  Conversation,
  GroupMemberSettings,
  GroupSettingsResponse,
  MemberRole,
  Message,
  MessageReaction,
  PresenceState,
  PrivacySettings,
  UserProfile,
} from '@/modules/gechat/types';

async function gechatFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Erro na API GêChat.');
  }
  return payload as T;
}

export const gechatApi = {
  async getConversations(): Promise<Conversation[]> {
    const data = await gechatFetch<{ conversations: Conversation[] }>('/api/gechat/conversations');
    return data.conversations;
  },

  async getMessages(conversationId: string, cursor?: string): Promise<{ messages: Message[]; nextCursor: string | null }> {
    const qs = new URLSearchParams();
    if (cursor) qs.set('cursor', cursor);
    return gechatFetch(`/api/gechat/conversations/${conversationId}/messages?${qs}`);
  },

  async getMembers(conversationId: string) {
    return gechatFetch<{ members: Array<{ userId: string; role: string; profile?: UserProfile }> }>(
      `/api/gechat/conversations/${conversationId}/members`,
    );
  },

  async markAsRead(conversationId: string) {
    return gechatFetch(`/api/gechat/conversations/${conversationId}/read`, { method: 'POST' });
  },

  async createDirect(targetUserId: string): Promise<Conversation> {
    const data = await gechatFetch<{ conversation: Conversation }>('/api/gechat/conversations/direct', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
    return data.conversation;
  },

  async createGroup(
    name: string,
    memberIds: string[],
    options?: { description?: string; avatarUrl?: string },
  ): Promise<Conversation> {
    const data = await gechatFetch<{ conversation: Conversation }>('/api/gechat/conversations/group', {
      method: 'POST',
      body: JSON.stringify({
        name,
        memberIds,
        description: options?.description,
        avatarUrl: options?.avatarUrl,
      }),
    });
    return data.conversation;
  },

  async createChannel(name: string, channelSubtype: ChannelSubtype, memberIds: string[]): Promise<Conversation> {
    const data = await gechatFetch<{ conversation: Conversation }>('/api/gechat/conversations/channel', {
      method: 'POST',
      body: JSON.stringify({ name, channelSubtype, memberIds }),
    });
    return data.conversation;
  },

  async getGroupSettings(conversationId: string): Promise<GroupSettingsResponse> {
    return gechatFetch(`/api/gechat/conversations/${conversationId}/group-settings`);
  },

  async updateGroup(
    conversationId: string,
    patch: {
      name?: string;
      description?: string;
      avatarUrl?: string | null;
      onlyAdminsCanEdit?: boolean;
      onlyAdminsCanSend?: boolean;
    },
  ) {
    return gechatFetch<{ conversation: GroupSettingsResponse['conversation'] }>(
      `/api/gechat/conversations/${conversationId}/group`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
  },

  async updateMemberSettings(
    conversationId: string,
    patch: Partial<Pick<GroupMemberSettings, 'muted' | 'notificationsEnabled'>>,
  ) {
    return gechatFetch<{ mySettings: GroupMemberSettings }>(
      `/api/gechat/conversations/${conversationId}/member-settings`,
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
  },

  async addGroupMembers(conversationId: string, memberIds: string[]) {
    return gechatFetch<{
      addedIds: string[];
      members: Array<{ userId: string; role: string; profile?: UserProfile }>;
    }>(`/api/gechat/conversations/${conversationId}/members`, {
      method: 'POST',
      body: JSON.stringify({ memberIds }),
    });
  },

  async updateGroupMemberRole(conversationId: string, userId: string, role: MemberRole) {
    return gechatFetch<{ member: { userId: string; role: MemberRole } }>(
      `/api/gechat/conversations/${conversationId}/members/${userId}`,
      { method: 'PATCH', body: JSON.stringify({ role }) },
    );
  },

  async removeGroupMember(conversationId: string, userId: string) {
    return gechatFetch<{ userId: string; conversationId: string }>(
      `/api/gechat/conversations/${conversationId}/members/${userId}`,
      { method: 'DELETE' },
    );
  },

  async getPresence(userIds: string[]): Promise<Record<string, PresenceState>> {
    if (!userIds.length) return {};
    const data = await gechatFetch<{ presence: Record<string, PresenceState> }>(
      `/api/gechat/presence?userIds=${userIds.join(',')}`,
    );
    return data.presence;
  },

  async listUsers(search?: string): Promise<UserProfile[]> {
    const qs = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    const data = await gechatFetch<{ users: UserProfile[] }>(`/api/gechat/users${qs}`);
    return data.users;
  },

  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const data = await gechatFetch<{ message: Message }>(
      `/api/gechat/conversations/${conversationId}/messages/${messageId}`,
      { method: 'PATCH', body: JSON.stringify({ content }) },
    );
    return data.message;
  },

  async deleteMessage(conversationId: string, messageId: string) {
    return gechatFetch<{ messageId: string; conversationId: string }>(
      `/api/gechat/conversations/${conversationId}/messages/${messageId}`,
      { method: 'DELETE' },
    );
  },

  async getMessageReads(conversationId: string, messageId: string) {
    return gechatFetch<{
      deliveredTo: Array<{
        userId: string;
        deliveredAt: string;
        profile: UserProfile;
      }>;
      readBy: Array<{
        userId: string;
        readAt: string;
        profile: UserProfile;
      }>;
    }>(`/api/gechat/conversations/${conversationId}/messages/${messageId}/reads`);
  },

  async toggleReaction(conversationId: string, messageId: string, emoji: string) {
    return gechatFetch<{
      messageId: string;
      conversationId: string;
      reactions: MessageReaction[];
    }>(`/api/gechat/conversations/${conversationId}/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  },

  async getPrivacy(): Promise<PrivacySettings> {
    const data = await gechatFetch<{ privacy: PrivacySettings & { userId?: string } }>(
      '/api/gechat/privacy',
    );
    return {
      readReceiptsEnabled: data.privacy.readReceiptsEnabled,
      lastSeenVisible: data.privacy.lastSeenVisible,
    };
  },

  async updatePrivacy(patch: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const data = await gechatFetch<{ privacy: PrivacySettings & { userId?: string } }>(
      '/api/gechat/privacy',
      { method: 'PATCH', body: JSON.stringify(patch) },
    );
    return {
      readReceiptsEnabled: data.privacy.readReceiptsEnabled,
      lastSeenVisible: data.privacy.lastSeenVisible,
    };
  },
};
