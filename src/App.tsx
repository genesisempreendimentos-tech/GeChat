import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAdminShortcut } from '@/hooks/useAdminShortcut';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useNaoGritaPopup, NaoGritaPopup } from '@/hooks/useNaoGritaPopup';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPalette } from '@/components/CommandPalette';
import { BottomNavigation } from '@/components/BottomNavigation';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { OnboardingTour } from '@/components/OnboardingTour';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/admin/AdminLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import DashboardPage from '@/pages/DashboardPage';
import SystemsPage from '@/pages/SystemsPage';
import FavoritesPage from '@/pages/FavoritesPage';
import UsersPage from '@/pages/UsersPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import ChatPage from '@/pages/ChatPage';

// Admin pages
import AdminDashboardPage from '@/admin/pages/AdminDashboardPage';
import AdminSystemsPage from '@/admin/pages/AdminSystemsPage';
import AdminMembersPage from '@/admin/pages/AdminMembersPage';
import AdminAdministratorsPage from '@/admin/pages/AdminAdministratorsPage';
import AdminCategoriesPage from '@/admin/pages/AdminCategoriesPage';

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();
  const { compactMode, animations } = useSettingsStore();

  // Aplicar configurações ao montar o componente
  useEffect(() => {
    // As configurações já são aplicadas pelo store, mas isso garante a aplicação inicial
    const root = document.documentElement;
    root.classList.toggle('compact-mode', compactMode);
    root.classList.toggle('reduce-motion', !animations);
  }, [compactMode, animations]);

  // Ativar atalho CTRL + SHIFT + A para login admin
  useAdminShortcut();

  // Ativar atalhos de teclado globais
  useKeyboardShortcuts();

  // Ativar atalho CTRL + SHIFT + B para popup "Não Grita"
  const { showPopup, setShowPopup } = useNaoGritaPopup();

  return (
    <>
      <AnimatedBackground />
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
            }
          />
          <Route
            path="/signup"
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
        </Route>

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/systems" element={<SystemsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Admin Routes (softadmin) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/home" replace />} />
          <Route path="home" element={<AdminDashboardPage />} />
          <Route path="systems" element={<AdminSystemsPage />} />
          <Route path="members" element={<AdminMembersPage />} />
          <Route path="administrators" element={<AdminAdministratorsPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
        </Route>

        {/* Redirect */}
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global Components */}
      <NaoGritaPopup show={showPopup} onClose={() => setShowPopup(false)} />
      {isAuthenticated && (
        <>
          <CommandPalette />
          <BottomNavigation />
          <OnboardingTour />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={300}>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}
