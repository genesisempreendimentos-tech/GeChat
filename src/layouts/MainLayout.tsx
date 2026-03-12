import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { motion } from 'framer-motion';
import { SidebarProvider, useSidebarWidth } from '@/contexts/SidebarContext';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
        className="pl-3 md:pl-4 pr-4 md:pr-6 pt-20 md:pt-[5.5rem] pb-20 md:pb-8 w-full max-w-7xl mx-auto"
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

  return (
    <SidebarProvider>
      <div className="min-h-screen relative z-[1] overflow-x-hidden">
        <Sidebar userRole={user?.role} />
        <MainContent />
      </div>
    </SidebarProvider>
  );
}
