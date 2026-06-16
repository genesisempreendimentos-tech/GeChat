import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Topbar from '@/components/layout/Topbar';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useState, useEffect, type ComponentType } from 'react';
import { MotionPage } from '@/components/motion/AppMotion';

function PanelMainContent({ ariaLabel }: { ariaLabel: string }) {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarWidth = useSidebarWidth();

  return (
    <motion.div
      className="min-h-screen min-w-0 overflow-x-hidden pt-16"
      initial={false}
      animate={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : '100%',
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <main
        className="px-1 md:px-2 pt-2 md:pt-2.5 pb-10 md:pb-3 w-full max-w-[1600px] mx-auto"
        role="main"
        aria-label={ariaLabel}
      >
        <MotionPage pageKey={location.pathname}>
          <Outlet />
        </MotionPage>
      </main>
    </motion.div>
  );
}

interface PanelShellProps {
  sidebar: ComponentType;
  mainAriaLabel: string;
}

export function PanelShell({ sidebar: Sidebar, mainAriaLabel }: PanelShellProps) {
  const [zoomLevelBack, setZoomLevelBack] = useState(100);

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem('pageZoom');
      setZoomLevelBack(Math.round(saved ? parseFloat(saved) : 100));
    };
    read();
    const id = setInterval(read, 100);
    return () => clearInterval(id);
  }, []);

  const containerHeight = `${(100 / zoomLevelBack) * 100}vh`;

  return (
    <SidebarProvider>
      <div
        className="dashboard-root relative z-[1] overflow-x-hidden"
        style={{
          height: containerHeight,
          minHeight: containerHeight,
          width: '100%',
        }}
      >
        <Topbar />
        <Sidebar />
        <PanelMainContent ariaLabel={mainAriaLabel} />
      </div>
    </SidebarProvider>
  );
}
