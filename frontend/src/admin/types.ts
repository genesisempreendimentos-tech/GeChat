export interface AdminOverview {
  onlineNow: number;
  activeUsers24h: number;
  activeUsers7d: number;
  conversationsTotal: number;
  conversationsByType: {
    direct: number;
    group: number;
    channel: number;
  };
  messagesToday: number;
  messages7d: number;
  failedMessages: number;
  restrictedGroups: number;
}

export interface AdminActivityPoint {
  date: string;
  messages: number;
}

export interface AdminActivityResponse {
  days: number;
  series: AdminActivityPoint[];
}

export interface AdminConversationMember {
  id: string;
  name: string;
}

export interface AdminConversationRow {
  id: string;
  type: 'direct' | 'group' | 'channel';
  name: string | null;
  channelSubtype: string | null;
  onlyAdminsCanSend: boolean;
  memberCount: number;
  members: AdminConversationMember[];
  memberNames: string;
  createdAt: string;
  lastMessageAt: string | null;
  displayName: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  accessType: string;
  profileStatus: string;
  createdAt: string | null;
  online: boolean;
  lastSeenAt: string | null;
}

export interface AdminHealth {
  api: boolean;
  neon: boolean;
  supabase: boolean;
  socketConnections: number;
  onlineUsers: number;
}
