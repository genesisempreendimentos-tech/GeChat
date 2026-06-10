import { LayoutDashboard, BarChart3, FileBarChart, Users } from 'lucide-react';

import { motion } from 'framer-motion';

import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

import { useState, useEffect, useRef } from 'react';

import { useSetSidebarWidth } from '@/contexts/SidebarContext';

import { useSidebarLayoutStore } from '@/store/sidebarLayoutStore';

import { SidebarFooterControl } from '@/components/layout/SidebarFooterControl';

import { SidebarNavItem } from '@/components/layout/SidebarNavItem';



const menuItems = [

  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },

  { icon: BarChart3, label: 'Análise', path: '/dados' },

  { icon: Users, label: 'Leads', path: '/leads' },

  { icon: FileBarChart, label: 'Relatórios', path: '/relatorios' },

];



interface SidebarProps {

  userRole?: string;

}



export default function Sidebar({ userRole }: SidebarProps) {

  void userRole;

  const location = useLocation();

  const layoutMode = useSidebarLayoutStore((s) => s.mode);

  const [isHovered, setIsHovered] = useState(false);

  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      className="hidden md:flex fixed left-0 top-16 bottom-0 bg-card/60 dark:bg-card/50 backdrop-blur-xl border-r border-border/70 flex-col z-40 overflow-hidden"

      data-tour="sidebar"

      role="navigation"

      aria-label="Navegação principal"

    >

      <nav
        className={cn(
          'min-h-0 flex-1 space-y-2 overflow-x-hidden px-0 pt-6 pb-2',
          isExpanded ? 'overflow-y-auto' : 'overflow-hidden',
        )}
      >

        {menuItems.map((item) => (

          <SidebarNavItem

            key={item.path}

            to={item.path}

            icon={item.icon}

            label={item.label}

            isActive={location.pathname === item.path}

            isExpanded={isExpanded}

            tourId={

              item.path === '/dashboard'

                ? 'menu-dashboard'

                : item.path === '/dados'

                  ? 'menu-dados'

                : item.path === '/relatorios'

                  ? 'menu-relatorios'

                : item.path === '/leads'

                  ? 'menu-leads'

                  : undefined

            }

          />

        ))}

      </nav>



      <div className="relative z-10 shrink-0 border-t border-border/70 bg-card/60 dark:bg-card/50">

        <SidebarFooterControl isExpanded={isExpanded} />

      </div>

    </motion.aside>

  );

}

