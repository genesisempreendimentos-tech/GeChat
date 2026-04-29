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
  /** `profiles.created_at` no Supabase (via `profileToUser` em `getUsers`). */
  createdAt?: Date;
  /** Tipo de acesso: 'admin' | 'creator' | 'user' (coluna access_type em profiles) */
  accessType?: string;
  /** Ciclo de vida da conta no painel admin (`profiles.profile_status`). */
  profileStatus?: 'active' | 'archived' | 'deleted';
  /** `profiles.sidebar`: hover | expanded | collapsed */
  sidebar?: SidebarMode;
}

// System types
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
  /** Status do app no painel admin */
  status?: AppStatus;
  initial_version?: string;
  next_release_version?: string;
  next_release_date?: string;
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
