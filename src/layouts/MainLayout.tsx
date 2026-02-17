import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { motion } from 'framer-motion';

export default function MainLayout() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen relative z-[1]">
      <Sidebar userRole={user?.role} />

      <div className="ml-0 md:ml-[280px] transition-all duration-300">
        <Topbar />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="px-4 md:px-6 pt-3 md:pt-5 pb-20 md:pb-8 max-w-7xl mx-auto md:ml-8 w-full"
          role="main"
          aria-label="Conteúdo principal"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
