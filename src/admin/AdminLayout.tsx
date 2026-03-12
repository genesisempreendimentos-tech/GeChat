import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { SidebarProvider } from '@/contexts/SidebarContext';
import AdminSidebar from '@/admin/AdminSidebar';
import Topbar from '@/components/layout/Topbar';

const SIDEBAR_COLLAPSED_WIDTH = 80;
const MAIN_OFFSET_DESKTOP = 212;

function AdminMainContent() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  return (
    <div
      className="min-h-screen min-w-0 w-full max-w-full overflow-x-hidden"
      style={{ marginLeft: isDesktop ? SIDEBAR_COLLAPSED_WIDTH : 0 }}
    >
      <Topbar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pl-3 md:pl-4 pr-4 md:pr-6 pt-20 md:pt-[5.5rem] pb-20 md:pb-8 w-full max-w-7xl mx-auto"
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
  return (
    <SidebarProvider>
      <div className="min-h-screen relative z-[1] overflow-x-hidden">
        <AdminSidebar />
        <AdminMainContent />
      </div>
    </SidebarProvider>
  );
}
