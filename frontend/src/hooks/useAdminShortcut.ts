import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook: CTRL + SHIFT + A — verifica access_type no usuário autenticado.
 * Se access_type === 'admin' → redireciona para o painel de admin (/admin/home).
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

      if (user.accessType === 'admin') {
        navigate('/admin/home');
        return;
      }

      navigate('/access-denied');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname, navigate, isAuthenticated, user?.id]);
}
