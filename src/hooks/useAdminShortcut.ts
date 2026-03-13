import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';

const ADMIN_ACCESS_TYPES = ['softadmin', 'appsadmin'];

/**
 * Hook: CTRL + SHIFT + A — verifica access_type no Supabase (profiles).
 * Se access_type === 'softadmin' ou 'appsadmin' → redireciona para o painel de admin (/admin/home).
 * Caso contrário → redireciona para /access-denied.
 */
export function useAdminShortcut() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key === 'A')) return;

      event.preventDefault();

      const path = location.pathname;
      if (path === '/login' || path === '/access-denied') return;

      if (!isAuthenticated || !user) {
        navigate('/login');
        return;
      }

      let accessType: string | null = null;
      for (const key of ['user_id']) {
        const { data, error } = await supabase
          .from('profiles')
          .select('access_type')
          .eq(key, user.id)
          .maybeSingle();
        if (!error && data) {
          const raw = (data as { access_type?: string; accessType?: string });
          accessType = raw.access_type ?? raw.accessType ?? null;
          break;
        }
      }

      const normalized = String(accessType ?? '').toLowerCase().trim();
      const hasAdminAccess = ADMIN_ACCESS_TYPES.includes(normalized);
      if (hasAdminAccess) {
        navigate('/admin/home');
        return;
      }

      navigate('/access-denied');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate, isAuthenticated, user?.id]);
}
