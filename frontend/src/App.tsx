import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useLocation,
  type Location as RouterLocation,
} from 'react-router-dom';
import { useEffect } from 'react';
import { initGeAdsAudit } from '@/assets/audit-log';
import { useAuthStore } from '@/store/authStore';
import { isAllowedReturnToUrl } from '@/services/authStorage';
import { getSafeInternalReturnPath } from '@/lib/postLoginRedirect';
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
import { LoadingGif } from '@/components/LoadingGif';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/admin/AdminLayout';

import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import DashboardPage from '@/pages/DashboardPage';
import LeadsPage from '@/pages/LeadsPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';

import AdminDashboardPage from '@/admin/pages/AdminDashboardPage';
import AdminMembersPage from '@/admin/pages/AdminMembersPage';

function LoginRoute() {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') ?? '';
  const validReturnTo = returnTo && isAllowedReturnToUrl(returnTo) ? returnTo : null;
  const from = (location.state as { from?: RouterLocation } | null)?.from;
  const internalAfterAuth = getSafeInternalReturnPath(from);

  useEffect(() => {
    if (isAuthenticated && validReturnTo) {
      window.location.href = validReturnTo;
    }
  }, [isAuthenticated, validReturnTo]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingGif size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;
  if (validReturnTo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingGif size="lg" />
      </div>
    );
  }
  return <Navigate to={internalAfterAuth} replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuthStore();
  const { compactMode, animations } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('compact-mode', compactMode);
    root.classList.toggle('reduce-motion', !animations);
  }, [compactMode, animations]);

  useAdminShortcut();
  useKeyboardShortcuts();

  useEffect(() => {
    if (!isAuthenticated) return;
    const cleanup = initGeAdsAudit();
    return () => {
      cleanup?.();
    };
  }, [isAuthenticated]);

  const { showPopup, setShowPopup } = useNaoGritaPopup();

  return (
    <>
      {isAuthenticated && <AnimatedBackground />}
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/signup"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignupPage />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/systems" element={<Navigate to="/leads" replace />} />
          <Route path="/favorites" element={<Navigate to="/leads" replace />} />
          <Route path="/solicitacoes" element={<Navigate to="/leads" replace />} />
          <Route path="/equipes" element={<Navigate to="/leads" replace />} />
          <Route path="/empresa" element={<Navigate to="/leads" replace />} />
          <Route path="/comunicados" element={<Navigate to="/leads" replace />} />
          <Route path="/chat" element={<Navigate to="/leads" replace />} />
        </Route>

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
          <Route path="members" element={<AdminMembersPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="systems" element={<Navigate to="/admin/members" replace />} />
          <Route path="solicitacoes" element={<Navigate to="/admin/members" replace />} />
          <Route path="equipes" element={<Navigate to="/admin/members" replace />} />
          <Route path="comunicados" element={<Navigate to="/admin/members" replace />} />
          <Route path="empresa" element={<Navigate to="/admin/members" replace />} />
          <Route path="categories" element={<Navigate to="/admin/members" replace />} />
          <Route path="reviews" element={<Navigate to="/admin/members" replace />} />
          <Route path="administrators" element={<Navigate to="/admin/members" replace />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

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
