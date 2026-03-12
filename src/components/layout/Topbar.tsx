import { useState } from 'react';
import { Bell, LogOut, UserCircle, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 right-0 z-30 flex items-center justify-end p-4 w-fit min-w-0">
      {/* Pill: só o tamanho do conteúdo, não empurrado pela nav */}
      <div
        className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card/30 dark:bg-card/20 backdrop-blur-xl shadow-sm shrink-0"
        style={{
          boxShadow: '0 0 0 1px hsl(var(--primary) / 0.06), 0 2px 8px hsl(0 0% 0% / 0.04)',
        }}
      >
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 h-9 w-9"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-destructive rounded-full" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <span className="text-primary-foreground font-semibold text-sm">
                    {user?.name?.charAt(0) ?? '?'}
                  </span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCircle className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutModal(true)} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair do GêApps</DialogTitle>
            <DialogDescription>
              Deseja realmente sair do GêApps? Você precisará fazer login novamente para acessar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowLogoutModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sim, sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
