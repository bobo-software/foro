import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/elements/ProtectedRoute';
import { RequireSuperAdmin } from './components/elements/RequireSuperAdmin';
import { SubscriptionGate } from './components/elements/SubscriptionGate';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { RouteLoadingFallback } from './components/error/RouteLoadingFallback';
import { useAuthSync } from './hooks/useAuthSync';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { usePrintLightMode } from './hooks/usePrintLightMode';
import { webSocketService } from './backend/services/WebSocketService';
import useAuthStore from './stores/data/AuthStore';
import useThemeStore from './stores/state/ThemeStore';
import './App.css';

// ── Eager-loaded (above the fold / small) ──────────────────────────
import { Landing } from './pages/Landing';
import { Login } from '@pages/auth/Login';
import { Register } from '@pages/auth/Register';

// ── Lazy-loaded (below login gate) ─────────────────────────────────
const VerifyOtp = lazy(() => import('@pages/auth/VerifyOtp').then((m) => ({ default: m.VerifyOtp })));
const ForgotPassword = lazy(() => import('@pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const VerifyForgotPasswordOtp = lazy(() => import('@pages/auth/VerifyForgotPasswordOtp').then((m) => ({ default: m.VerifyForgotPasswordOtp })));
const ResetPassword = lazy(() => import('@pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const Onboard = lazy(() => import('@pages/admin/Onboard').then((m) => ({ default: m.Onboard })));
const AppLayout = lazy(() => import('./layouts/AppLayout').then((m) => ({ default: m.AppLayout })));
const DashboardPage = lazy(() => import('@pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const InvoiceDetailPage = lazy(() => import('@pages/admin/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })));
const InvoiceFormPage = lazy(() => import('@pages/admin/InvoiceFormPage').then((m) => ({ default: m.InvoiceFormPage })));
const CompaniesPage = lazy(() => import('@/pages/admin/companies/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('@/pages/admin/companies/companyPage/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const CompanyProjectsPage = lazy(() => import('@/pages/admin/companies/CompanyProjectsPage').then((m) => ({ default: m.CompanyProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/pages/admin/companies/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const MyTasksPage = lazy(() => import('@/pages/admin/tasks/MyTasksPage').then((m) => ({ default: m.MyTasksPage })));
const ProjectsOverviewPage = lazy(() =>
  import('@/pages/admin/projects/ProjectsOverviewPage').then((m) => ({ default: m.ProjectsOverviewPage }))
);
const CompanyFormPage = lazy(() => import('@/pages/admin/companies/CompanyFormPage').then((m) => ({ default: m.CompanyFormPage })));
const ItemsPage = lazy(() => import('@pages/admin/ItemsPage').then((m) => ({ default: m.ItemsPage })));
const ItemDetailPage = lazy(() => import('@pages/admin/ItemDetailPage').then((m) => ({ default: m.ItemDetailPage })));
const ItemFormPage = lazy(() => import('@pages/admin/ItemFormPage').then((m) => ({ default: m.ItemFormPage })));
const DocumentsPage = lazy(() => import('@pages/admin/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const InvoiceList = lazy(() => import('@/components/elements/InvoiceList').then((m) => ({ default: m.InvoiceList })));
const QuotationList = lazy(() => import('@/components/elements/QuotationList').then((m) => ({ default: m.QuotationList })));
const DocumentsTrashPage = lazy(() => import('@pages/admin/DocumentsTrashPage').then((m) => ({ default: m.DocumentsTrashPage })));
const QuotationListPage = lazy(() => import('@pages/admin/QuotationListPage').then((m) => ({ default: m.QuotationListPage })));
const QuotationDetailPage = lazy(() => import('@pages/admin/QuotationDetailPage').then((m) => ({ default: m.QuotationDetailPage })));
const QuotationFormPage = lazy(() => import('@pages/admin/QuotationFormPage').then((m) => ({ default: m.QuotationFormPage })));
const StatementsPage = lazy(() => import('@pages/admin/StatementsPage').then((m) => ({ default: m.StatementsPage })));
const PaymentsPage = lazy(() => import('@pages/admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const PaymentFormPage = lazy(() => import('@pages/admin/PaymentFormPage').then((m) => ({ default: m.PaymentFormPage })));
const SettingsPage = lazy(() => import('@/pages/admin/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const BusinessSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.BusinessSettingsTab })));
const BankingSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.BankingSettingsTab })));
const DocumentSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.DocumentSettingsTab })));
const PreferencesSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.PreferencesSettingsTab })));
const TeamSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.TeamSettingsTab })));
const BillingSettingsTab = lazy(() => import('@pages/admin/settings/tabs').then((m) => ({ default: m.BillingSettingsTab })));
const PaymentSuccess = lazy(() => import('@pages/payment/PaymentSuccess').then((m) => ({ default: m.PaymentSuccess })));
const PaymentCancel = lazy(() => import('@pages/payment/PaymentCancel').then((m) => ({ default: m.PaymentCancel })));
const InviteAccept = lazy(() => import('@pages/team/InviteAccept').then((m) => ({ default: m.InviteAccept })));
const InvitePostAuth = lazy(() => import('@pages/team/InvitePostAuth').then((m) => ({ default: m.InvitePostAuth })));
const PortalLandingPage = lazy(() => import('@pages/portal/PortalLandingPage').then((m) => ({ default: m.PortalLandingPage })));
const PortalProjectViewPage = lazy(() => import('@pages/portal/PortalProjectViewPage').then((m) => ({ default: m.PortalProjectViewPage })));
const StatementPortalEntryPage = lazy(() => import('@pages/statements/StatementPortalEntryPage').then((m) => ({ default: m.StatementPortalEntryPage })));
const StatementPortalViewPage = lazy(() => import('@pages/statements/StatementPortalViewPage').then((m) => ({ default: m.StatementPortalViewPage })));
const StatementPortalInvoiceViewPage = lazy(() => import('@pages/statements/StatementPortalInvoiceViewPage').then((m) => ({ default: m.StatementPortalInvoiceViewPage })));
const RequestLogsPage = lazy(() => import('@pages/superadmin/RequestLogsPage').then((m) => ({ default: m.RequestLogsPage })));

/**
 * Auth and WebSocket hooks wrapper component
 * Activates multi-tab sync, proactive token refresh, and WebSocket connection
 */
function AuthHooks() {
  useAuthSync();
  useTokenRefresh();

  // This component mounts on app load regardless of auth state (it lives
  // above the public routes), so the socket connection must react to
  // isAuthenticated changing rather than only running once on mount —
  // otherwise a visitor who logs in without a full page reload never gets
  // a realtime connection.
  const isAuthenticated = useAuthStore((s) => !!(s.sessionUser?.accessToken || s.accessToken));

  useEffect(() => {
    if (!isAuthenticated) {
      webSocketService.disconnect();
      return;
    }

    webSocketService.init();

    return () => {
      webSocketService.disconnect();
    };
  }, [isAuthenticated]);

  return null;
}

/**
 * Unauthorized page component
 */
function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">403</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          You don't have permission to access this page.
        </p>
        <a
          href="/app/dashboard"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  );
}

function App() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  usePrintLightMode();

  return (
    <ErrorBoundary>
      <AuthProvider verifyOnMount={true}>
        <AuthHooks />
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/verify" element={<VerifyForgotPasswordOtp />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/superadmin/request-logs"
              element={
                <RequireSuperAdmin>
                  <RequestLogsPage />
                </RequireSuperAdmin>
              }
            />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/invite/:token/accept" element={<InvitePostAuth />} />
            <Route path="/portal/v/:portalToken" element={<PortalProjectViewPage />} />
            <Route path="/portal" element={<PortalLandingPage />} />
            <Route path="/statements" element={<StatementPortalEntryPage />} />
            <Route path="/statements/:companyId" element={<StatementPortalViewPage />} />
            <Route path="/statements/:companyId/invoices/:invoiceId" element={<StatementPortalInvoiceViewPage />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/cancel" element={<PaymentCancel />} />

            {/* Onboarding - requires auth but no role check */}
            <Route path="/onboard" element={<ProtectedRoute><Onboard /></ProtectedRoute>} />

            {/* Protected app routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <SubscriptionGate>
                    <AppLayout />
                  </SubscriptionGate>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="tasks" element={<MyTasksPage />} />
              <Route path="projects" element={<ProjectsOverviewPage />} />
              <Route path="companies" element={<Outlet />}>
                <Route index element={<CompaniesPage />} />
                <Route path="create" element={<CompanyFormPage />} />
                <Route path=":id" element={<CompanyDetailPage />} />
                <Route path=":id/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path=":id/projects" element={<CompanyProjectsPage />} />
                <Route path=":id/edit" element={<CompanyFormPage />} />
              </Route>
              <Route path="invoices" element={<Outlet />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="create" element={<InvoiceFormPage />} />
                <Route path=":id" element={<InvoiceDetailPage />} />
                <Route path=":id/edit" element={<InvoiceFormPage />} />
              </Route>
              <Route path="items" element={<Outlet />}>
                <Route index element={<ItemsPage />} />
                <Route path="create" element={<ItemFormPage />} />
                <Route path=":id" element={<ItemDetailPage />} />
                <Route path=":id/edit" element={<ItemFormPage />} />
              </Route>
              <Route path="documents" element={<DocumentsPage />}>
                <Route index element={<Navigate to="invoices" replace />} />
                <Route path="invoices" element={<InvoiceList />} />
                <Route path="quotations" element={<QuotationList />} />
                <Route path="credit-notes" element={<InvoiceList documentKind="credit_note" />} />
                <Route path="trash" element={<DocumentsTrashPage />} />
              </Route>
              <Route path="quotations" element={<Outlet />}>
                <Route index element={<QuotationListPage />} />
                <Route path="create" element={<QuotationFormPage />} />
                <Route path=":id" element={<QuotationDetailPage />} />
                <Route path=":id/edit" element={<QuotationFormPage />} />
              </Route>
              <Route path="payments" element={<Outlet />}>
                <Route index element={<PaymentsPage />} />
                <Route path="create" element={<PaymentFormPage />} />
                <Route path=":id/edit" element={<PaymentFormPage />} />
              </Route>
              <Route path="statements" element={<StatementsPage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<BusinessSettingsTab />} />
                <Route path="banking" element={<BankingSettingsTab />} />
                <Route path="documents" element={<DocumentSettingsTab />} />
                <Route path="preferences" element={<PreferencesSettingsTab />} />
                <Route path="team" element={<TeamSettingsTab />} />
                <Route path="billing" element={<BillingSettingsTab />} />
              </Route>
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
