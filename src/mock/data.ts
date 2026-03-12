import { User, System, UserSystemAccess, AccessLog } from '@/types';

// Mock Users - Agora os usuários são criados via cadastro no Supabase
export const mockUsers: User[] = [];

// Mock Systems - VAZIO: Os sistemas agora vêm do Supabase
// GeStack foi renomeado para GêApps (são o mesmo sistema)
export const mockSystems: System[] = [];

// Mock User System Access - apenas derivado de mockSystems (vazio: sem apps em mock)
export const mockUserSystemAccess: UserSystemAccess[] = [];

// Mock Access Logs - vazio: sem apps em mock
export const mockAccessLogs: AccessLog[] = [];
