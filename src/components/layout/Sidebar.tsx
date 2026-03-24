import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Star,
  Users,
  MessageCircle,
  ExternalLink,
  Check,
  UserKey,
  UserStar,
  Boxes,
  Headset,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useUnviewedComunicados } from '@/hooks/useUnviewedComunicados';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Boxes, label: 'Aplicativos', path: '/systems' },
  { icon: Headset, label: 'Solicitações', path: '/solicitacoes' },
  { icon: Megaphone, label: 'Comunicados', path: '/comunicados' },
  { icon: Users, label: 'Equipes', path: '/equipes' },
  { icon: Star, label: 'Favoritos', path: '/favorites' },
  // { icon: MessageCircle, label: 'Chat', path: '/chat' },
];

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isSoftadmin } = useAdminAccess();
  const hasUnviewedComunicados = useUnviewedComunicados();
  const isInAdmin = location.pathname.startsWith('/admin');
  const layoutMode = useSidebarLayoutStore((s) => s.mode);
  const [isHovered, setIsHovered] = useState(false);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [favoriteSystems, setFavoriteSystems] = useState<{ id: string; name: string; url: string }[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      databaseService.getUserSystemAccess(user.id),
      databaseService.getSystems(),
    ]).then(([accessRes, systemsRes]) => {
      const accessData = accessRes.data || [];
      const systemsData = (systemsRes.data || []) as { id: string; name: string; url: string }[];
      // Só favoritos com acesso liberado (access false / revogado não aparece — alinhado a FavoritesPage / getSystemsForMember)
      const hasAccess = (a: any) =>
        a.access !== false && a.can_access !== false;
      const favoriteIds = accessData
        .filter((a: any) => !!(a.is_favorite ?? a.favorite) && hasAccess(a))
        .map((a: any) => a.system_id);
      const list = systemsData.filter((s) => favoriteIds.includes(s.id));
      setFavoriteSystems(list);
    });
  }, [user?.id, location.pathname]);

  const isExpanded =
    layoutMode === 'expanded' ? true : layoutMode === 'collapsed' ? false : isHovered;
  const setSidebarWidth = useSetSidebarWidth();

  useEffect(() => {
    setSidebarWidth(isExpanded ? 280 : 80);
  }, [isExpanded, setSidebarWidth]);

  const filteredMenu = menuItems;

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => {
          if (layoutMode !== 'hover') return;
          if (hoverCloseTimer.current) {
            clearTimeout(hoverCloseTimer.current);
            hoverCloseTimer.current = null;
          }
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (layoutMode !== 'hover') return;
          hoverCloseTimer.current = setTimeout(() => {
            setIsHovered(false);
          }, 1000);
        }}
        className="hidden md:flex fixed left-0 top-0 bottom-0 bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo — dropdown Painel User / Painel Admin (somente access_type softadmin/appsadmin) */}
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
                    GêApps
                  </span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="center" className="min-w-[180px]" sideOffset={4}>
              <DropdownMenuItem onClick={() => navigate('/dashboard')} className="gap-2 cursor-pointer">
                {!isInAdmin && <Check className="h-4 w-4 shrink-0" />}
                {isInAdmin && <span className="w-4 shrink-0" />}
                <UserKey className="h-4 w-4 shrink-0" />
                Painel User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/home')} className="gap-2 cursor-pointer">
                {isInAdmin && <Check className="h-4 w-4 shrink-0" />}
                {!isInAdmin && <span className="w-4 shrink-0" />}
                <UserStar className="h-4 w-4 shrink-0" />
                Painel Admin
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
                GêApps
              </span>
            </div>
          </div>
        )}

      {/* Navigation - altura fixa no modo recolhido para não quebrar com fonte grande */}
      <nav className={cn(
        'flex-1 overflow-y-auto pb-32',
        isExpanded ? 'px-4 py-6 space-y-2' : 'px-2 py-4 flex flex-col items-stretch gap-2'
      )}>
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isFavorites = item.path === '/favorites';
          const isComunicados = item.path === '/comunicados';

          return (
            <div key={item.path} className="space-y-0.5">
              <Link to={item.path} className="block" title={item.label} aria-label={item.label}>
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
                  <span className="relative flex shrink-0 w-5 h-5 items-center justify-center">
                    <Icon className="w-5 h-5" />
                    {isComunicados && hasUnviewedComunicados ? (
                      <span
                        className={cn(
                          'absolute right-0 top-0 h-2 w-2 rounded-full bg-destructive ring-2 pointer-events-none',
                          isActive ? 'ring-primary-foreground' : 'ring-background'
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </span>
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
              {isFavorites && favoriteSystems.length > 0 && (
                <div
                  className={cn(
                    'pl-4 pr-2 py-1 space-y-0.5 border-l-2 border-primary/20 ml-4 overflow-hidden transition-all duration-200',
                    isExpanded ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 py-0'
                  )}
                >
                    {favoriteSystems.map((sys) => (
                      <a
                        key={sys.id}
                        href={sys.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors group"
                        title={`Abrir ${sys.name}`}
                      >
                        <span className="truncate flex-1 min-w-0">{sys.name}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-70" />
                      </a>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer — controle de modo do sidebar (sempre visível) */}
      <div className="border-t border-border/70 shrink-0">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>

  </>
  );
}
