export type ConversationType = 'direct' | 'group' | 'channel';

export type ChannelSubtype = 'geral' | 'setor' | 'projeto' | 'avisos';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageType = 'text' | 'image' | 'file' | 'audio';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type MemberRole = 'admin' | 'member';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: MemberRole;
  lastReadAt?: string | null;
  joinedAt: string;
  profile?: UserProfile;
}

export interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  status?: MessageStatus;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string | null;
  description?: string | null;
  onlyAdminsCanEdit?: boolean;
  onlyAdminsCanSend?: boolean;
  channelSubtype?: ChannelSubtype | null;
  displayName?: string;
  avatar?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: LastMessage | null;
  unreadCount?: number;
  otherMemberId?: string | null;
  otherMember?: UserProfile;
  memberIds?: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: string;
  updatedAt?: string;
  editedAt?: string | null;
  clientId?: string;
  readBy?: ReadReceipt[];
  reactions?: MessageReaction[];
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt?: string;
}

export interface TypingEvent {
  conversationId: string;
  userId: string;
  userName?: string;
}

export interface PresenceState {
  userId: string;
  online: boolean;
  lastSeenAt?: string | null;
  presenceHidden?: boolean;
}

export interface PrivacySettings {
  readReceiptsEnabled: boolean;
  lastSeenVisible: boolean;
}

export interface GroupMemberSettings {
  role: MemberRole;
  muted: boolean;
  notificationsEnabled: boolean;
}

export interface GroupSettingsResponse {
  conversation: Pick<
    Conversation,
    'id' | 'name' | 'description' | 'avatar' | 'onlyAdminsCanEdit' | 'onlyAdminsCanSend' | 'createdBy' | 'createdAt' | 'updatedAt'
  >;
  mySettings: GroupMemberSettings;
  members: Array<{
    userId: string;
    role: MemberRole;
    profile?: UserProfile;
  }>;
}

export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type?: MessageType;
  clientId?: string;
}

export interface ReplyQuote {
  messageId: string;
  senderName: string;
  preview: string;
}
