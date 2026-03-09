import { User, System, UserSystemAccess, AccessLog } from '@/types';

// Mock Users - Agora os usuários são criados via cadastro no Supabase
export const mockUsers: User[] = [];

// Mock Systems - VAZIO: Os sistemas agora vêm do Supabase
// GeStack foi renomeado para GêApps (são o mesmo sistema)
export const mockSystems: System[] = [];

// Mock User System Access
export const mockUserSystemAccess: UserSystemAccess[] = [
  // Admin has access to everything
  ...mockSystems.map((system, index) => ({
    id: `access-admin-${index}`,
    userId: '1',
    systemId: system.id,
    canAccess: true,
    isFavorite: index < 4, // First 4 are favorites
  })),
  // Manager has access to most systems
  ...mockSystems.filter(s => s.id !== '10').map((system, index) => ({
    id: `access-manager-${index}`,
    userId: '2',
    systemId: system.id,
    canAccess: true,
    isFavorite: index < 2,
  })),
  // Regular users have limited access
  { id: 'access-user1-1', userId: '3', systemId: '1', canAccess: true, isFavorite: true },
  { id: 'access-user1-2', userId: '3', systemId: '5', canAccess: true, isFavorite: true },
  { id: 'access-user1-3', userId: '3', systemId: '7', canAccess: true, isFavorite: false },
  { id: 'access-user2-1', userId: '4', systemId: '2', canAccess: true, isFavorite: true },
  { id: 'access-user2-2', userId: '4', systemId: '3', canAccess: true, isFavorite: false },
  { id: 'access-user2-3', userId: '4', systemId: '8', canAccess: true, isFavorite: true },
];

// Mock Access Logs
export const mockAccessLogs: AccessLog[] = [
  {
    id: '1',
    userId: '1',
    systemId: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
  },
  {
    id: '2',
    userId: '1',
    systemId: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  },
  {
    id: '3',
    userId: '2',
    systemId: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
  },
  {
    id: '4',
    userId: '1',
    systemId: '6',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
  },
  {
    id: '5',
    userId: '3',
    systemId: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
  },
];
