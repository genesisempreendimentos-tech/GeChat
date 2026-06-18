import { type LucideIcon, LayoutDashboard, UserKey, LibraryBig, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useSetSidebarWidth } from '@/contexts/SidebarContext';
import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';
import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';
import { SidebarNavItem, SidebarSectionTitle } from '@/components/layout/SidebarNavItem';

type AdminNavItem = {
  icon: LucideIcon;
  label: string;
  path: string;
};

type AdminNavSection = { title: string; items: AdminNavItem[] };

const adminMenuSections: AdminNavSection[] = [
  {
    title: 'GêLeads',
    items: [{ icon: LayoutDashboard, label: 'Dashboard', path: '/admin/home' }],
  },
  {
    title: 'Admin',
    items: [
      { icon: UserKey, label: 'Usuários', path: '/admin/members' },
      { icon: LibraryBig, label: 'Categorias', path: '/admin/categories' },
      { icon: Building2, label: 'Empreendimentos', path: '/admin/empreendimentos' },
    ],
  },
];

export default function AdminSidebar() {
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
      aria-label="Navegação admin"
    >
      <nav className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-0 pt-6 pb-2">
        {adminMenuSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn(!isExpanded && sectionIndex > 0 && 'pt-1')}>
            <SidebarSectionTitle title={section.title} isExpanded={isExpanded} />
            {!isExpanded && sectionIndex > 0 ? (
              <div className="mx-3 mb-2 h-px bg-border/60" aria-hidden />
            ) : null}
            <div className="space-y-2">
              {section.items.map((item) => (
                <SidebarNavItem
                  key={item.path}
                  to={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={location.pathname === item.path}
                  isExpanded={isExpanded}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">
        <SidebarFooterControl isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
