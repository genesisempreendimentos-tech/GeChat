import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  type LucideIcon,
  LayoutDashboard,
  Users,
  UserKey,
  UserStar,
  LibraryBig,
  Check,
  Boxes,
  Headset,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
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

type AdminNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type AdminNavSection = { title: string; items: AdminNavItem[] };

const adminMenuSections: AdminNavSection[] = [
  {
    title: 'GêApps',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/home' },
      { icon: Boxes, label: 'Aplicativos', path: '/admin/systems' },
      { icon: LibraryBig, label: 'Categorias', path: '/admin/categories' },
      { icon: UserKey, label: 'Usuários', path: '/admin/members' },
    ],
  },
  {
    title: 'Integrações',
    items: [
      { icon: Users, label: 'Equipes', path: '/admin/equipes' },
      { icon: Headset, label: 'Solicitações', path: '/admin/solicitacoes' },
      { icon: Megaphone, label: 'Comunicados', path: '/admin/comunicados' },
    ],
  },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSoftadmin } = useAdminAccess();
  const hasUnviewedComunicados = useUnviewedComunicados();
  const isInAdmin = location.pathname.startsWith('/admin');
  const layoutMode = useSidebarLayoutStore((s) => s.mode);
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded =
    layoutMode === 'expanded' ? true : layoutMode === 'collapsed' ? false : isHovered;
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
          if (layoutMode !== 'hover') return;
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (layoutMode !== 'hover') return;
          setIsHovered(false);
        }}
        className="hidden md:flex fixed left-0 top-0 h-screen bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
        role="navigation"
        aria-label="Navegação admin"
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
                    Admin
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
                Admin
              </span>
            </div>
          </div>
        )}

        <nav
          className={cn(
            'flex-1 overflow-y-auto',
            isExpanded ? 'px-4 py-6 space-y-4' : 'px-2 py-4 flex flex-col items-stretch gap-2'
          )}
        >
          {adminMenuSections.map((section, sectionIndex) => (
            <div key={section.title} className={cn(!isExpanded && sectionIndex > 0 && 'pt-1')}>
              {isExpanded ? (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-4 pb-2 pt-1 first:pt-0">
                  {section.title}
                </p>
              ) : sectionIndex > 0 ? (
                <div className="h-px bg-border/60 mx-1 mb-2" aria-hidden />
              ) : null}
              <div className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  const isComunicados = item.path === '/admin/comunicados';

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
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border/70 shrink-0">
          <SidebarFooterControl isExpanded={isExpanded} />
        </div>
      </motion.aside>

    </>
  );
}
