import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Verifica se o usuário atual tem acesso ao painel admin (access_type === 'admin').
 * Usado para proteger rotas /admin/*.
 */
export function useAdminAccess(): { isSoftadmin: boolean; loading: boolean } {
  const user = useAuthStore((s) => s.user);
  const isSoftadmin = useMemo(() => user?.accessType === 'admin', [user?.accessType]);

  return { isSoftadmin, loading: false };
}
