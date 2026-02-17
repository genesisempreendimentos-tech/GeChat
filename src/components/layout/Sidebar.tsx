import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  AppWindow,
  Star,
  Users,
  MessageCircle,
  Settings,
  Pin,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { databaseService } from '@/services/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: AppWindow, label: 'Sistemas', path: '/systems' },
  { icon: Star, label: 'Favoritos', path: '/favorites' },
  { icon: MessageCircle, label: 'Chat', path: '/chat' },
  { icon: Users, label: 'Usuários', path: '/users', adminOnly: true },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [pinned, setPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned');
    return saved ? JSON.parse(saved) : false;
  });
  const [isHovered, setIsHovered] = useState(false);
  const [favoriteSystems, setFavoriteSystems] = useState<{ id: string; name: string; url: string }[]>([]);

  useEffect(() => {
    localStorage.setItem('sidebar-pinned', JSON.stringify(pinned));
  }, [pinned]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      databaseService.getUserSystemAccess(user.id),
      databaseService.getSystems(),
    ]).then(([accessRes, systemsRes]) => {
      const accessData = accessRes.data || [];
      const systemsData = (systemsRes.data || []) as { id: string; name: string; url: string }[];
      const favoriteIds = accessData
        .filter((a: any) => a.is_favorite ?? a.favorite)
        .map((a: any) => a.system_id);
      const list = systemsData.filter((s) => favoriteIds.includes(s.id));
      setFavoriteSystems(list);
    });
  }, [user?.id, location.pathname]);

  const isExpanded = pinned || isHovered;

  const filteredMenu = menuItems.filter(
    (item) => !item.adminOnly || userRole === 'admin' || userRole === 'gerente'
  );

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 280 : 80 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => !pinned && setIsHovered(true)}
        onMouseLeave={() => !pinned && setIsHovered(false)}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center p-1.5">
              <img
                src="/assets/GêTudo.svg"
                alt="GêTudo"
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
              GêTudo
            </span>
          </div>
        </div>

      {/* Navigation - altura fixa no modo recolhido para não quebrar com fonte grande */}
      <nav className={cn(
        'flex-1 overflow-y-auto',
        isExpanded ? 'px-4 py-6 space-y-2' : 'px-2 py-4 flex flex-col items-stretch gap-2'
      )}>
        {filteredMenu.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isFavorites = item.path === '/favorites';

          return (
            <div key={item.path} className="space-y-0.5">
              <Link to={item.path} className="block">
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

      {/* Footer */}
      <div
        className={cn(
          'p-4 border-t border-border/70 overflow-hidden transition-all duration-200 shrink-0',
          isExpanded ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 py-0'
        )}
      >
        <p className="text-xs text-muted-foreground text-center">
          GêTudo v1.0.0
        </p>
      </div>
    </motion.aside>

    {/* Pin Button - Na interseção do sidebar com o main view */}
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
