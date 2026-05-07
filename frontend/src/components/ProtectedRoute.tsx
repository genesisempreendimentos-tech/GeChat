import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ReactNode, useEffect, useState } from 'react';
import { databaseService } from '@/services/supabase';
import { LoadingGif } from '@/components/LoadingGif';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, logout } = useAuthStore();
  const location = useLocation();
  const [checkingGeNovoAccess, setCheckingGeNovoAccess] = useState(true);
  const [geNovoExplicitlyBlocked, setGeNovoExplicitlyBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkGeNovoAccess = async () => {
      if (!isAuthenticated || !user?.id) {
        if (mounted) {
          setGeNovoExplicitlyBlocked(false);
          setCheckingGeNovoAccess(false);
        }
        return;
      }

      setCheckingGeNovoAccess(true);
      const { data } = await databaseService.getGeNovoExplicitAccess(user.id);
      if (!mounted) return;
      // Regra explícita: bloquear APENAS quando access = false.
      setGeNovoExplicitlyBlocked(data === false);
      setCheckingGeNovoAccess(false);
    };
    void checkGeNovoAccess();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id]);

  if (loading || checkingGeNovoAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingGif size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (geNovoExplicitlyBlocked) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso removido</DialogTitle>
            <DialogDescription>
              Você não tem permissão para acessar esta área no modo demo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                void logout();
              }}
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return <>{children}</>;
}
