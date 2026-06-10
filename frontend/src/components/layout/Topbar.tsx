import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, LogOut, UserCircle, Settings, LifeBuoy, Lightbulb, ExternalLink } from 'lucide-react';
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
import Zoom from './Zoom';
import { NotificationsPanel, type NotificationItem } from '@/components/notifications/NotificationsPanel';
import HelpModal from '@/views/navbar/HelpModal';
import { Quotes } from '@/components/ui/quotes';
import { AppBrandControl } from '@/components/layout/AppBrandHeader';
import { SIDEBAR_BRAND_WIDTH } from '@/lib/sidebarLayout';
import { GEAPPS_PROFILE_URL } from '@/lib/brandAssets';

function TopbarActions() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [quoteFetchKey, setQuoteFetchKey] = useState(0);
  const [notificationItems] = useState<NotificationItem[]>([]);
  const notificationUnreadCount = notificationItems.filter((n) => !n.read).length;

  const handleProfileClick = () => {
    window.location.href = GEAPPS_PROFILE_URL;
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 p-1.5 shadow-sm transition-colors hover:bg-muted/50">
        <DropdownMenu
          open={tipsOpen}
          onOpenChange={(open) => {
            setTipsOpen(open);
            if (open) setQuoteFetchKey((key) => key + 1);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full text-muted-foreground shadow-sm transition-all hover:bg-background/80 hover:text-foreground"
              aria-label="Citação do dia"
            >
              <Lightbulb className="h-[18px] w-[18px]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="bottom"
            sideOffset={6}
            collisionPadding={12}
            className="w-max min-w-0 max-w-[min(100vw-1.5rem,22rem)] border-border/60 bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Quotes open={tipsOpen} fetchKey={quoteFetchKey} />
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-full text-muted-foreground shadow-sm transition-all hover:bg-background/80 hover:text-foreground"
          onClick={() => setNotificationsOpen(true)}
          aria-label="Abrir notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notificationUnreadCount > 0 ? (
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-background bg-destructive"
              aria-hidden
            />
          ) : null}
        </Button>
        <div className="mx-0.5 h-4 w-px shrink-0 self-center bg-border/60" aria-hidden />
        <ThemeToggle className="relative h-8 w-8 rounded-full text-muted-foreground shadow-sm transition-all hover:bg-background/80 hover:text-foreground" />
        <span className="hidden items-center lg:inline-flex">
          <Zoom />
        </span>
        <div className="mx-0.5 h-4 w-px shrink-0 self-center bg-border/60" aria-hidden />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-transparent transition-all hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-primary/50"
              aria-label="Menu do usuário"
              data-tour="profile-area"
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-primary/10 shadow-sm">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold text-primary">{user?.name?.charAt(0) ?? '?'}</span>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleProfileClick} className="justify-between gap-2">
              <span className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4 shrink-0" />
                Perfil
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowHelpModal(true)}>
              <LifeBuoy className="mr-2 h-4 w-4" />
              Ajuda
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowLogoutModal(true)} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <HelpModal open={showHelpModal} onOpenChange={setShowHelpModal} />

      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair do GêLeads</DialogTitle>
            <DialogDescription>
              Deseja realmente sair? Você precisará entrar de novo para acessar.
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

      <NotificationsPanel
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        items={notificationItems}
      />
    </>
  );
}

export default function Topbar() {
  const header = (
    <header
      className="fixed inset-x-0 top-0 z-[100] flex h-16 items-center border-b border-border/70 bg-card/60 backdrop-blur-xl dark:bg-card/50"
      data-tour="top-nav"
    >
      <div
        className="hidden shrink-0 items-center justify-center px-6 md:flex"
        style={{ width: SIDEBAR_BRAND_WIDTH }}
      >
        <AppBrandControl />
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 md:justify-end md:gap-4 md:px-6">
        <div className="shrink-0 md:hidden">
          <AppBrandControl />
        </div>
        <TopbarActions />
      </div>
    </header>
  );

  if (typeof document === 'undefined') return header;
  return createPortal(header, document.body);
}
