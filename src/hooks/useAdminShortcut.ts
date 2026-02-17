import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Hook para ativar atalho CTRL + SHIFT + B para acessar login admin
 */
export function useAdminShortcut() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CTRL + SHIFT + A
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        
        // Só redireciona se não estiver autenticado ou na página de login
        if (location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/') {
          console.log('🔐 Atalho Admin ativado! Redirecionando para /login/admin');
          navigate('/login/admin');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, location]);
}
