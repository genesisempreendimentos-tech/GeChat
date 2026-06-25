import { LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { SidebarNavItem } from '@/components/layout/SidebarNavItem';
import { Home } from 'lucide-react';

const userMenuItems = [
  { icon: Home, label: 'Início', path: '/' },
  { icon: LayoutGrid, label: 'Item 1', path: '/item-1' },
  { icon: LayoutGrid, label: 'Item 2', path: '/item-2' },
  { icon: LayoutGrid, label: 'Item 3', path: '/item-3' },
  { icon: LayoutGrid, label: 'Item 4', path: '/item-4' },
];

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
        {userMenuItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            to={item.path}
            icon={item.icon}
            label={item.label}
            isActive={
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)
            }
            isExpanded={isExpanded}
          />
        ))}
      </nav>

      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
