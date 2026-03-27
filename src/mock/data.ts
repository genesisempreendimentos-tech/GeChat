import { User, System, UserSystemAccess, AccessLog } from '@/types';

// Mock Users - Agora os usuários são criados via cadastro no Supabase
export const mockUsers: User[] = [];

// Mock Systems - VAZIO: Os sistemas agora vêm do Supabase
// Dados legados removidos — use `src/mocks/uiShellData.ts` para o mock de UI.
export const mockSystems: System[] = [];

// Mock User System Access - apenas derivado de mockSystems (vazio: sem apps em mock)
export const mockUserSystemAccess: UserSystemAccess[] = [];

// Mock Access Logs - vazio: sem apps em mock
export const mockAccessLogs: AccessLog[] = [];
