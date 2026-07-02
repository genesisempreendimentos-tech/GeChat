import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { LoadingGif } from '@/components/LoadingGif';
import { useAppHubAudit } from '@/hooks/useAppHubAudit';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();
  const hubState = useAppHubAudit(isAuthenticated);

  if (loading || (isAuthenticated && hubState === 'loading')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingGif size="xl" className="h-24 w-24 sm:h-28 sm:w-28" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (hubState === 'denied') {
    return <Navigate to="/sem-acesso-app" replace />;
  }

  return <>{children}</>;
}
