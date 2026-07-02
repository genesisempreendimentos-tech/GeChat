import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useAppHubAudit } from '@/hooks/useAppHubAudit';
import { ReactNode } from 'react';
import { LoadingGifScreen } from '@/components/LoadingGif';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Protege rotas do painel admin: exige autenticação e role === 'admin'.
 * Caso contrário redireciona para /login ou /access-denied.
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const { isSoftadmin, loading } = useAdminAccess();
  const hubState = useAppHubAudit(isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading || hubState === 'loading') {
    return <LoadingGifScreen />;
  }

  if (hubState === 'denied') {
    return <Navigate to="/sem-acesso-app" replace />;
  }

  if (!isSoftadmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
