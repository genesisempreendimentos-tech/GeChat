import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarProvider } from '@/contexts/SidebarContext';
import AdminSidebar from '@/admin/AdminSidebar';
import Topbar from '@/components/layout/Topbar';
import { useState, useEffect } from 'react';

const SIDEBAR_COLLAPSED_WIDTH = 80;
const MAIN_OFFSET_DESKTOP = 212;

function AdminMainContent() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div
      className="min-h-screen min-w-0 overflow-x-hidden flex flex-col"
      style={{
        marginLeft: isDesktop ? SIDEBAR_COLLAPSED_WIDTH : 0,
        width: isDesktop ? `calc(100% - ${SIDEBAR_COLLAPSED_WIDTH}px)` : '100%',
      }}
    >
      <Topbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 min-w-0 pl-3 md:pl-4 pr-4 md:pr-6 pt-6 md:pt-8 pb-20 md:pb-8 w-full max-w-[1600px] mx-auto"
        style={isDesktop ? { marginLeft: MAIN_OFFSET_DESKTOP } : undefined}
        role="main"
        aria-label="Painel administrativo"
      >
        <Outlet />
      </motion.main>
    </div>
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
        <AdminSidebar />
        <AdminMainContent />
      </div>
    </SidebarProvider>
  );
}
