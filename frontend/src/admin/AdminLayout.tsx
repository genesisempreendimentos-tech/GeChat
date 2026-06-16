import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import AdminSidebar from '@/admin/AdminSidebar';
import Topbar from '@/components/layout/Topbar';
import { useState, useEffect } from 'react';
import { MotionPage } from '@/components/motion/AppMotion';

const TRANSITION = { duration: 0.25, ease: [0.4, 0, 0.2, 1] };

function AdminMainContent() {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarWidth = useSidebarWidth();
  const ml = isDesktop ? sidebarWidth : 0;

  return (
    <motion.div
      className="min-h-screen min-w-0 overflow-x-hidden flex flex-col pt-16"
      animate={{ marginLeft: ml, width: isDesktop ? `calc(100% - ${ml}px)` : '100%' }}
      transition={TRANSITION}
    >
      <main
        className="flex-1 min-w-0 px-1 md:px-2 pt-2 md:pt-2.5 pb-10 md:pb-3 w-full max-w-[1600px] mx-auto"
        role="main"
        aria-label="Painel administrativo"
      >
        <MotionPage pageKey={location.pathname}>
          <Outlet />
        </MotionPage>
      </main>
    </motion.div>
  );
}

export default function AdminLayout() {
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
        <AdminSidebar />
        <AdminMainContent />
      </div>
    </SidebarProvider>
  );
}
