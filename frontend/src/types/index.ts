// User types
import type { SidebarMode } from '@/lib/sidebarMode';

export type UserRole = 'admin' | 'creator' | 'user';

export type { SidebarMode };

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt?: Date;
  accessType?: string;
  profileStatus?: 'active' | 'archived' | 'deleted';
  sidebar?: SidebarMode;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'ativo' | 'arquivado' | 'excluído';
}

export type SystemCategory = 'RH' | 'Financeiro' | 'Marketing' | 'Arquitetura' | 'Ferramentas' | string;

export type AppStatus =
  | 'ativo'
  | 'lancamento'
  | 'beta'
  | 'rascunho'
  | 'arquivado'
  | 'excluído'
  | 'excluido';

export interface System {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  category: SystemCategory;
  active: boolean;
  createdAt: Date;
  status?: AppStatus;
  initial_version?: string;
  next_release_version?: string;
  next_release_date?: string;
}

export interface UserSystemAccess {
  id: string;
  userId: string;
  systemId: string;
  canAccess: boolean;
  isFavorite: boolean;
}

export interface AccessLog {
  id: string;
  userId: string;
  systemId: string;
  timestamp: Date;
  userName?: string;
  systemName?: string;
}

export interface DashboardStats {
  totalSystems: number;
  activeSystems: number;
  favoriteCount: number;
  recentAccessCount: number;
}

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
