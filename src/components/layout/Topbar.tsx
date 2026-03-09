import { Bell, LogOut, UserCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';

export default function Topbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
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
            <button className="flex items-center gap-2 pl-1 pr-3 py-2 rounded-xl hover:bg-primary/5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} />
                ) : (
                  <span className="text-primary-foreground font-semibold text-sm">
                    {user?.name?.charAt(0)}
                  </span>
                )}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <UserCircle className="w-4 h-4 mr-2" />
              {user?.name || 'Perfil'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
