import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';

const ADMIN_ACCESS_TYPES = ['softadmin', 'appsadmin'];

/**
 * Verifica se o usuário atual tem acesso ao painel admin (access_type === 'softadmin' ou 'appsadmin' em profiles).
 * Usado para proteger rotas /admin/*.
 */
export function useAdminAccess(): { isSoftadmin: boolean; loading: boolean } {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [isSoftadmin, setIsSoftadmin] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      setIsSoftadmin(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      let accessType: string | null = null;
      for (const key of ['user_id']) {
        const { data, error } = await supabase
          .from('profiles')
          .select('access_type')
          .eq(key, user.id)
          .maybeSingle();
        if (!error && data) {
          const raw = data as { access_type?: string; accessType?: string };
          accessType = raw.access_type ?? raw.accessType ?? null;
          break;
        }
      }
      const normalized = String(accessType ?? '').toLowerCase().trim();
      const hasAdminAccess = ADMIN_ACCESS_TYPES.includes(normalized);
      if (!cancelled) {
        setIsSoftadmin(hasAdminAccess);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { isSoftadmin, loading };
}
