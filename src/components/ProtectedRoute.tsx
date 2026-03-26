import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ReactNode, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { databaseService } from '@/services/supabase';
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
  const [checkingGeAppsAccess, setCheckingGeAppsAccess] = useState(true);
  const [geAppsExplicitlyBlocked, setGeAppsExplicitlyBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkGeAppsAccess = async () => {
      if (!isAuthenticated || !user?.id) {
        if (mounted) {
          setGeAppsExplicitlyBlocked(false);
          setCheckingGeAppsAccess(false);
        }
        return;
      }

      setCheckingGeAppsAccess(true);
      const { data } = await databaseService.getGeAppsExplicitAccess(user.id);
      if (!mounted) return;
      // Regra explícita: bloquear APENAS quando access = false.
      setGeAppsExplicitlyBlocked(data === false);
      setCheckingGeAppsAccess(false);
    };
    void checkGeAppsAccess();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, user?.id]);

  if (loading || checkingGeAppsAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Carregando sessão" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (geAppsExplicitlyBlocked) {
    return (
      <Dialog open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Acesso removido</DialogTitle>
            <DialogDescription>
              Você não tem permissão para acessar o GêApps e nenhum outro aplicativo da Gênesis Empreendimentos.
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
