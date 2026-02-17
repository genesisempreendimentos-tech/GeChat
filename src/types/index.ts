// User types
export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
}

// System types
export type SystemCategory = 'RH' | 'Financeiro' | 'Marketing' | 'Arquitetura' | 'Ferramentas';

export interface System {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: SystemCategory;
  active: boolean;
  createdAt: Date;
}

// User System Access
export interface UserSystemAccess {
  id: string;
  userId: string;
  systemId: string;
  canAccess: boolean;
  isFavorite: boolean;
}

// Access Log
export interface AccessLog {
  id: string;
  userId: string;
  systemId: string;
  timestamp: Date;
  userName?: string;
  systemName?: string;
}

// Statistics
export interface DashboardStats {
  totalSystems: number;
  activeSystems: number;
  favoriteCount: number;
  recentAccessCount: number;
}

// Chat
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  participants?: { id: string; name: string; email: string; avatar?: string }[];
  last_message?: { content: string; created_at: string; sender_id: string };
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: { id: string; name: string; avatar?: string };
}
