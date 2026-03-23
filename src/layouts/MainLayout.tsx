import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { motion } from 'framer-motion';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useState, useEffect } from 'react';

function MainContent() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarWidth = useSidebarWidth();

  return (
    <motion.div
      className="min-h-screen min-w-0 overflow-x-hidden"
      initial={false}
      animate={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : '100%',
      }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <Topbar />
        <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pl-3 md:pl-4 pr-4 md:pr-6 pt-6 md:pt-8 pb-20 md:pb-8 w-full max-w-[1600px] mx-auto"
        role="main"
        aria-label="Conteúdo principal"
      >
        <Outlet />
      </motion.main>
    </motion.div>
  );
}

export default function MainLayout() {
  const { user } = useAuthStore();
  const [zoomLevelBack, setZoomLevelBack] = useState(100);

  // Polling para altura
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
        <Sidebar userRole={user?.accessType} />
        <MainContent />
      </div>
    </SidebarProvider>
  );
}
