import type {
  AdminActivityResponse,
  AdminConversationRow,
  AdminHealth,
  AdminOverview,
  AdminUserRow,
} from '@/admin/types';
import type { Conversation, Message } from '@/modules/gechat/types';

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    throw new Error(payload?.error ?? 'Erro na API admin.');
  }
  return payload as T;
}

export const adminApi = {
  async getOverview(): Promise<AdminOverview> {
    const data = await adminFetch<{ overview: AdminOverview }>('/api/admin/overview');
    return data.overview;
  },

  async getActivity(days = 7): Promise<AdminActivityResponse> {
    return adminFetch<AdminActivityResponse>(`/api/admin/activity?days=${days}`);
  },

  async getConversations(limit = 50): Promise<AdminConversationRow[]> {
    const data = await adminFetch<{ conversations: AdminConversationRow[] }>(
      `/api/admin/conversations?limit=${limit}`,
    );
    return data.conversations;
  },

  async getConversationDetail(conversationId: string): Promise<{
    conversation: Conversation;
    members: Array<{ id: string; name: string; avatar: string | null; role: string }>;
  }> {
    return adminFetch(`/api/admin/conversations/${conversationId}`);
  },

  async getConversationMessages(
    conversationId: string,
    cursor?: string | null,
  ): Promise<{ messages: Message[]; nextCursor: string | null }> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return adminFetch(`/api/admin/conversations/${conversationId}/messages${qs}`);
  },

  async getUsers(): Promise<AdminUserRow[]> {
    const data = await adminFetch<{ users: AdminUserRow[] }>('/api/admin/users');
    return data.users;
  },

  async getHealth(): Promise<AdminHealth> {
    const data = await adminFetch<{ health: AdminHealth }>('/api/admin/health');
    return data.health;
  },
};
