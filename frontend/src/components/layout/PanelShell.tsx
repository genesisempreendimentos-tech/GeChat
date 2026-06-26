import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Topbar from '@/components/layout/Topbar';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useState, useEffect, type ComponentType } from 'react';
import { MotionPage } from '@/components/motion/AppMotion';
import { cn } from '@/lib/utils';

function isSettingsPath(pathname: string) {
  return /\/settings\/?$/.test(pathname);
}

function PanelMainContent({
  ariaLabel,
  mainClassName,
  hideSidebar,
}: {
  ariaLabel: string;
  mainClassName?: string;
  hideSidebar: boolean;
}) {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarWidth = useSidebarWidth();
  const settingsView = isSettingsPath(location.pathname);
  const isFullBleed = Boolean(mainClassName?.includes('gechat-main')) && !settingsView;
  const effectiveSidebarWidth = hideSidebar || settingsView ? 0 : sidebarWidth;

  return (
    <motion.div
      className={cn(
        'min-w-0 overflow-x-hidden pt-16',
        isFullBleed ? 'flex h-screen flex-col overflow-hidden' : 'min-h-screen',
      )}
      initial={false}
      animate={{
        marginLeft: isDesktop ? effectiveSidebarWidth : 0,
        width: isDesktop ? `calc(100% - ${effectiveSidebarWidth}px)` : '100%',
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <main
        className={cn(
          isFullBleed
            ? 'gechat-main flex min-h-0 w-full flex-1 flex-col overflow-hidden p-0'
            : 'mx-auto w-full max-w-[1600px] px-1 pb-10 pt-2 md:px-2 md:pb-3 md:pt-2.5',
          settingsView && 'min-h-screen',
          mainClassName && !settingsView && mainClassName,
        )}
        role="main"
        aria-label={ariaLabel}
      >
        <MotionPage pageKey={location.pathname} className="flex h-full min-h-0 flex-1 flex-col">
          <Outlet />
        </MotionPage>
      </main>
    </motion.div>
  );
}

interface PanelShellProps {
  sidebar: ComponentType;
  mainAriaLabel: string;
  mainClassName?: string;
}

export function PanelShell({ sidebar: Sidebar, mainAriaLabel, mainClassName }: PanelShellProps) {
  const location = useLocation();
  const hideSidebar = isSettingsPath(location.pathname);
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
        {!hideSidebar ? <Sidebar /> : null}
        <PanelMainContent
          ariaLabel={mainAriaLabel}
          mainClassName={mainClassName}
          hideSidebar={hideSidebar}
        />
      </div>
    </SidebarProvider>
  );
}
