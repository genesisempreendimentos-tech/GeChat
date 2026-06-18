import { Home, HandCoins, Users, Building2, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { SidebarNavItem } from '@/components/layout/SidebarNavItem';

export default function UserSidebar() {
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
      role="navigation"
      aria-label="Navegação do painel User"
    >
      <nav
        className={cn(
          'min-h-0 flex-1 space-y-2 overflow-x-hidden px-0 pt-6 pb-2',
          isExpanded ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >
        <SidebarNavItem
          to="/"
          icon={Home}
          label="Comece aqui"
          isActive={location.pathname === '/'}
          isExpanded={isExpanded}
        />
        <SidebarNavItem
          to="/vendas"
          icon={HandCoins}
          label="Vendas"
          isActive={location.pathname.startsWith('/vendas')}
          isExpanded={isExpanded}
        />
        <SidebarNavItem
          to="/leads"
          icon={Users}
          label="Leads"
          isActive={location.pathname.startsWith('/leads')}
          isExpanded={isExpanded}
        />
        <SidebarNavItem
          to="/empreendimentos"
          icon={Building2}
          label="Empreendimentos"
          isActive={location.pathname.startsWith('/empreendimentos')}
          isExpanded={isExpanded}
        />
        <SidebarNavItem
          to="/historico"
          icon={History}
          label="Histórico"
          isActive={location.pathname.startsWith('/historico')}
          isExpanded={isExpanded}
        />
      </nav>

      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
