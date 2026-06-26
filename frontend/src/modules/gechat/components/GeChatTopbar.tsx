import { useState } from 'react';
import { ArrowLeft, Bell, LogOut, MessageSquare, Search, Settings, UserCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsPanel, type NotificationItem } from '@/components/notifications/NotificationsPanel';

interface GeChatTopbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function GeChatTopbar({ searchQuery, onSearchChange }: GeChatTopbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationItems] = useState<NotificationItem[]>([]);
  const unread = notificationItems.filter((n) => !n.read).length;

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-card/60 px-3 backdrop-blur-xl dark:bg-card/50 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link to="/" aria-label="Voltar ao app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="hidden text-sm font-semibold sm:inline">GêChat</span>
          </div>
        </div>

        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar conversas..."
            className="h-9 pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-background bg-destructive" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10"
                aria-label="Menu do usuário"
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-primary">{user?.name?.charAt(0) ?? '?'}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/')}>
                <UserCircle className="mr-2 h-4 w-4" />
                App central
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <NotificationsPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} items={notificationItems} />
    </>
  );
}
