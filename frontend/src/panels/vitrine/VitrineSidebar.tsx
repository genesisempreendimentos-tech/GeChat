import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BarChart3, FileBarChart, Users, Hourglass, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { SidebarNavGroup, SidebarNavItem } from '@/components/layout/SidebarNavItem';
import { vitrinePath } from '@/lib/panels';

type MenuItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  tourId?: string;
  children?: { label: string; path: string }[];
};

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: vitrinePath('/dashboard'), tourId: 'menu-dashboard' },
  {
    icon: BarChart3,
    label: 'Análise',
    path: vitrinePath('/dados'),
    tourId: 'menu-dados',
    children: [{ label: 'Qualidade', path: vitrinePath('/dados/qualidade') }],
  },
  { icon: Hourglass, label: 'Maturação', path: vitrinePath('/maturacao') },
  { icon: Building2, label: 'Empreendimentos', path: vitrinePath('/empreendimentos') },
  { icon: Users, label: 'Leads', path: vitrinePath('/leads'), tourId: 'menu-leads' },
  { icon: FileBarChart, label: 'Relatórios', path: vitrinePath('/relatorios'), tourId: 'menu-relatorios' },
];

export default function VitrineSidebar() {
  const location = useLocation();
  const layoutMode = useSidebarLayoutStore((s) => s.mode);
  const [isHovered, setIsHovered] = useState(false);
  const isExpanded =
    layoutMode === 'expanded' ? true : layoutMode === 'collapsed' ? false : isHovered;
  const setSidebarWidth = useSetSidebarWidth();

  useEffect(() => {
    setSidebarWidth(isExpanded ? 280 : 80);
  }, [isExpanded, setSidebarWidth]);

  return (
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
      className="hidden md:flex fixed left-0 top-16 bottom-0 bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"
      data-tour="sidebar"
      role="navigation"
      aria-label="Navegação da Vitrine"
    >
      <nav
        className={cn(
          'min-h-0 flex-1 space-y-2 overflow-x-hidden px-0 pt-6 pb-2',
          isExpanded ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >
        {menuItems.map((item) =>
          item.children?.length ? (
            <SidebarNavGroup
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
              isExpanded={isExpanded}
              currentPath={location.pathname}
              tourId={item.tourId}
              sectionOpen={location.pathname.startsWith(item.path)}
              children={item.children}
            />
          ) : (
            <SidebarNavItem
              key={item.path}
              to={item.path}
              icon={item.icon}
              label={item.label}
              isActive={location.pathname === item.path}
              isExpanded={isExpanded}
              tourId={item.tourId}
            />
          ),
        )}
      </nav>

      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
