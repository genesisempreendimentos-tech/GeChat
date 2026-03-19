import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Shield,
  Pin,
  LibraryBig,
  MessageSquareQuote,
  Check,
  UserCircle,
  Boxes,
  Star,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const adminMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/home' },
  { icon: Boxes, label: 'Aplicativos', path: '/admin/systems' },
  { icon: Star, label: 'Favoritos', path: '/favorites' },
  { icon: Send, label: 'Solicitações', path: '/admin/solicitacoes' },
  { icon: LibraryBig, label: 'Categorias', path: '/admin/categories' },
  { icon: Users, label: 'Membros', path: '/admin/members' },
  { icon: Shield, label: 'Administradores', path: '/admin/administrators' },
  { icon: MessageSquareQuote, label: 'Avaliações', path: '/admin/reviews' },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSoftadmin } = useAdminAccess();
  const isInAdmin = location.pathname.startsWith('/admin');
  const [pinned, setPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-admin-pinned');
    return saved ? JSON.parse(saved) : false;
  });
  const [isHovered, setIsHovered] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SIDEBAR_CLOSE_DELAY_MS = 2000;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    if (pinned) return;
    closeTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      closeTimerRef.current = null;
    }, SIDEBAR_CLOSE_DELAY_MS);
  };

  useEffect(() => {
    localStorage.setItem('sidebar-admin-pinned', JSON.stringify(pinned));
  }, [pinned]);

  useEffect(() => () => clearCloseTimer(), []);

  const isExpanded = pinned || isHovered;
  const setSidebarWidth = useSetSidebarWidth();

  useEffect(() => {
    setSidebarWidth(isExpanded ? 280 : 80);
  }, [isExpanded, setSidebarWidth]);

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => {
          clearCloseTimer();
          if (!pinned) setIsHovered(true);
        }}
        onMouseLeave={() => scheduleClose()}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
        role="navigation"
        aria-label="Navegação admin"
      >
        {/* Logo — dropdown Painel de membro / Painel admin (somente access_type softadmin/appsadmin) */}
        {isSoftadmin ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  'h-16 flex items-center justify-center px-6 border-b border-border/70 shrink-0 cursor-pointer hover:bg-accent/30 transition-colors outline-none',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
                aria-label="Trocar painel"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center p-1.5">
                    <img
                      src="/assets/GêApps.svg"
                      alt="GêApps"
                      className="w-full h-full object-contain"
                      style={{
                        filter: 'brightness(0) saturate(100%) invert(55%) sepia(89%) saturate(2148%) hue-rotate(138deg) brightness(91%) contrast(96%)',
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-200',
                      isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                    )}
                  >
                    Admin
                  </span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="center" className="min-w-[180px]" sideOffset={4}>
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-2 cursor-pointer">
                {!isInAdmin && <Check className="h-4 w-4 shrink-0" />}
                {isInAdmin && <span className="w-4 shrink-0" />}
                <UserCircle className="h-4 w-4 shrink-0" />
                Painel de membro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/home')} className="gap-2 cursor-pointer">
                {isInAdmin && <Check className="h-4 w-4 shrink-0" />}
                {!isInAdmin && <span className="w-4 shrink-0" />}
                <Shield className="h-4 w-4 shrink-0" />
                Painel admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="h-16 flex items-center justify-center px-6 border-b border-border/70 shrink-0 cursor-default">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center p-1.5">
                <img
                  src="/assets/GêApps.svg"
                  alt="GêApps"
                  className="w-full h-full object-contain"
                  style={{
                    filter: 'brightness(0) saturate(100%) invert(55%) sepia(89%) saturate(2148%) hue-rotate(138deg) brightness(91%) contrast(96%)',
                  }}
                />
              </div>
              <span
                className={cn(
                  'text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent whitespace-nowrap overflow-hidden transition-all duration-200',
                  isExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0'
                )}
              >
                Admin
              </span>
            </div>
          </div>
        )}

        <nav
          className={cn(
            'flex-1 overflow-y-auto',
            isExpanded ? 'px-4 py-6 space-y-2' : 'px-2 py-4 flex flex-col items-stretch gap-2'
          )}
        >
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="space-y-0.5">
                <Link
                  to={item.path}
                  className="block"
                  title={item.label}
                  aria-label={item.label}
                >
                  <motion.div
                    whileHover={isActive ? undefined : { scale: 1.02 }}
                    whileTap={isActive ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      'flex items-center rounded-lg cursor-pointer relative overflow-hidden',
                      'transition-[background-color,color] duration-150 ease-out',
                      isExpanded ? 'gap-3 px-4 py-3' : 'min-h-[48px] justify-center px-2',
                      isActive
                        ? 'bg-primary/90 text-primary-foreground hover:bg-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span
                      className={cn(
                        'font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-200',
                        isExpanded ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                      )}
                    >
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              </div>
            );
          })}
        </nav>

        <div
          className={cn(
            'p-4 border-t border-border/70 overflow-hidden transition-all duration-200 shrink-0',
            isExpanded ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 py-0'
          )}
        >
          <p className="text-xs text-muted-foreground text-center">
            GêApps Admin v1.0.0
          </p>
        </div>
      </motion.aside>

      <motion.button
        initial={false}
        animate={{ x: isExpanded ? 264 : 72 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => setPinned(!pinned)}
        className={cn(
          'fixed top-4 z-50 p-2 rounded-full shadow-lg transition-all duration-200',
          'hover:scale-110 active:scale-95',
          pinned
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-card/70 dark:bg-card/60 backdrop-blur-lg border border-border/80 hover:bg-accent/80'
        )}
        title={pinned ? 'Desafixar menu' : 'Fixar menu'}
      >
        <Pin
          className={cn(
            'w-4 h-4 transition-all duration-200',
            pinned ? 'rotate-0' : 'rotate-45'
          )}
        />
      </motion.button>

    </>
  );
}
