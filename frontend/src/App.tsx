import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useSearchParams,
  useLocation,
  type Location as RouterLocation,
} from 'react-router-dom';
import { useEffect } from 'react';
import { initGeNovoAudit } from '@/assets/audit-log';
import { useAuthStore } from '@/store/authStore';
import { isAllowedReturnToUrl } from '@/services/authStorage';
import { getSafeInternalReturnPath } from '@/lib/postLoginRedirect';
import { vitrinePath } from '@/lib/panels';
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
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import AdminLayout from '@/admin/AdminLayout';
import { UserLayout, UserHomePage, UserItemPage } from '@/panels/user';
import { VitrineLayout, vitrineLegacyRedirectRoutes } from '@/panels/vitrine';
import VitrineItemPage from '@/panels/vitrine/pages/VitrineItemPage';

import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AdminDashboardPage from '@/admin/pages/AdminDashboardPage';
import AdminMembersPage from '@/admin/pages/AdminMembersPage';
import AdminCategoriesPage from '@/admin/pages/AdminCategoriesPage';

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
        <LoadingGif size="xl" className="h-24 w-24 sm:h-28 sm:w-28" />
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;
  if (validReturnTo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingGif size="xl" className="h-24 w-24 sm:h-28 sm:w-28" />
      </div>
    );
  }
  return <Navigate to={internalAfterAuth} replace />;
}

function VitrinePanelExtras() {
  const location = useLocation();
  const isVitrine = location.pathname.startsWith('/vitrine');

  if (!isVitrine) return null;

  return (
    <>
      <CommandPalette />
      <BottomNavigation />
      <OnboardingTour />
    </>
  );
}

function AuthenticatedArea() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
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
    const cleanup = initGeNovoAudit();
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
            element={isAuthenticated ? <Navigate to="/" replace /> : <SignupPage />}
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />
        </Route>

        <Route element={<AuthenticatedArea />}>
          {vitrineLegacyRedirectRoutes}

          <Route element={<UserLayout />}>
            <Route index element={<UserHomePage />} />
            <Route path="/item-1" element={<UserItemPage itemNumber={1} />} />
            <Route path="/item-2" element={<UserItemPage itemNumber={2} />} />
            <Route path="/item-3" element={<UserItemPage itemNumber={3} />} />
            <Route path="/item-4" element={<UserItemPage itemNumber={4} />} />
          </Route>

          <Route path="/vitrine" element={<VitrineLayout />}>
            <Route index element={<Navigate to={vitrinePath('/item-1')} replace />} />
            <Route path="item-1" element={<VitrineItemPage itemNumber={1} />} />
            <Route path="item-2" element={<VitrineItemPage itemNumber={2} />} />
            <Route path="item-3" element={<VitrineItemPage itemNumber={3} />} />
            <Route path="item-4" element={<VitrineItemPage itemNumber={4} />} />
            <Route path="item-5" element={<VitrineItemPage itemNumber={5} />} />
            <Route path="item-6" element={<VitrineItemPage itemNumber={6} />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
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
          <Route path="categories" element={<AdminCategoriesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <NaoGritaPopup show={showPopup} onClose={() => setShowPopup(false)} />
      {isAuthenticated && <VitrinePanelExtras />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <TooltipProvider delayDuration={300}>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}
