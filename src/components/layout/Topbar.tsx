import { useState } from 'react';
import { Bell, LogOut, UserCircle, Settings, LifeBuoy } from 'lucide-react';
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
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import Zoom from './Zoom';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import HelpModal from '@/views/navbar/HelpModal';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isInAdmin = location.pathname.startsWith('/admin');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleProfileClick = () => {
    navigate(isInAdmin ? '/admin/profile' : '/profile');
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-end px-4 md:px-6 h-16 w-full border-b border-border/70 bg-card/60 dark:bg-card/50 backdrop-blur-xl shrink-0 transition-all duration-300">
      <div className="flex items-center gap-1.5 shrink-0 bg-muted/40 hover:bg-muted/50 border border-border/50 rounded-full p-1.5 shadow-sm transition-colors">
        <span className="hidden lg:flex items-center border-r border-border/50 pr-1.5 mr-0.5">
          <Zoom />
        </span>
        <ThemeToggle className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 shadow-sm transition-all" />
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 shadow-sm transition-all"
          onClick={() => setNotificationsOpen(true)}
          aria-label="Abrir notificações"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive border-2 border-background rounded-full" />
        </Button>
        <div className="w-[1px] h-4 bg-border/50 mx-0.5" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all shrink-0 focus-visible:outline-none focus-visible:ring-primary/50" aria-label="Menu do usuário">
              <div className="w-full h-full rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-sm">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-semibold text-sm">
                    {user?.name?.charAt(0) ?? '?'}
                  </span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleProfileClick}>
              <UserCircle className="w-4 h-4 mr-2" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowHelpModal(true)}>
              <LifeBuoy className="w-4 h-4 mr-2" />
              Ajuda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutModal(true)} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <HelpModal open={showHelpModal} onOpenChange={setShowHelpModal} />

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

      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </header>
  );
}
