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
import { initGeLeadsAudit } from '@/assets/audit-log';
import { useAuthStore } from '@/store/authStore';
import { isAllowedReturnToUrl } from '@/services/authStorage';
import { getSafeInternalReturnPath } from '@/lib/postLoginRedirect';
import { GEAPPS_PROFILE_URL } from '@/lib/brandAssets';
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
import { UserLayout, UserHomePage, VendasPage, UserLeadsPage, UserEmpreendimentosPage } from '@/panels/user';
import { VitrineLayout, vitrineLegacyRedirectRoutes } from '@/panels/vitrine';

import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import DashboardPage from '@/pages/DashboardPage';
import DadosPage from '@/pages/DadosPage';
import MaturacaoPage from '@/pages/MaturacaoPage';
import EmpreendimentosPage from '@/pages/EmpreendimentosPage';
import QualidadePage from '@/pages/QualidadePage';
import LeadsPage from '@/pages/LeadsPage';
import RelatoriosPage from '@/pages/RelatoriosPage';
import SettingsPage from '@/pages/SettingsPage';
import NotificationsPage from '@/pages/NotificationsPage';
import AdminDashboardPage from '@/admin/pages/AdminDashboardPage';
import AdminMembersPage from '@/admin/pages/AdminMembersPage';
import AdminCategoriesPage from '@/admin/pages/AdminCategoriesPage';
import AdminReviewsPage from '@/admin/pages/AdminReviewsPage';
import AdminAdministratorsPage from '@/admin/pages/AdminAdministratorsPage';
import AdminEmpreendimentosPage from '@/admin/pages/AdminEmpreendimentosPage';

function GeAppsProfileRedirect() {
  useEffect(() => {
    window.location.replace(GEAPPS_PROFILE_URL);
  }, []);
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingGif size="xl" className="h-24 w-24 sm:h-28 sm:w-28" />
    </div>
  );
}

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
    const cleanup = initGeLeadsAudit();
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
            <Route path="/vendas" element={<VendasPage />} />
            <Route path="/leads" element={<UserLeadsPage />} />
            <Route path="/empreendimentos" element={<UserEmpreendimentosPage />} />
          </Route>

          <Route path="/vitrine" element={<VitrineLayout />}>
            <Route index element={<Navigate to={vitrinePath('/dashboard')} replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dados" element={<DadosPage />} />
            <Route path="dados/qualidade" element={<QualidadePage />} />
            <Route path="maturacao" element={<MaturacaoPage />} />
            <Route path="empreendimentos" element={<EmpreendimentosPage />} />
            <Route path="relatorios" element={<RelatoriosPage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<GeAppsProfileRedirect />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="chat" element={<Navigate to={vitrinePath('/leads')} replace />} />
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
          <Route path="profile" element={<GeAppsProfileRedirect />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="administrators" element={<AdminAdministratorsPage />} />
          <Route path="empreendimentos" element={<AdminEmpreendimentosPage />} />
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
