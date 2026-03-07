import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/elements/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteLoadingFallback } from './components/RouteLoadingFallback';
import { useAuthSync } from './hooks/useAuthSync';
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { webSocketService } from './backend/services/WebSocketService';
import { SKAFTIN_CONFIG } from './config/skaftin.config';
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
const InvoiceListPage = lazy(() => import('@pages/admin/InvoiceListPage').then((m) => ({ default: m.InvoiceListPage })));
const InvoiceDetailPage = lazy(() => import('@pages/admin/InvoiceDetailPage').then((m) => ({ default: m.InvoiceDetailPage })));
const InvoiceFormPage = lazy(() => import('@pages/admin/InvoiceFormPage').then((m) => ({ default: m.InvoiceFormPage })));
const CompaniesPage = lazy(() => import('@/pages/admin/companies/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('@/pages/admin/companies/companyPage/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const CompanyFormPage = lazy(() => import('@/pages/admin/companies/CompanyFormPage').then((m) => ({ default: m.CompanyFormPage })));
const ItemsPage = lazy(() => import('@pages/admin/ItemsPage').then((m) => ({ default: m.ItemsPage })));
const ItemDetailPage = lazy(() => import('@pages/admin/ItemDetailPage').then((m) => ({ default: m.ItemDetailPage })));
const ItemFormPage = lazy(() => import('@pages/admin/ItemFormPage').then((m) => ({ default: m.ItemFormPage })));
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

/**
 * Auth and WebSocket hooks wrapper component
 * Activates multi-tab sync, proactive token refresh, and WebSocket connection
 */
function AuthHooks() {
  useAuthSync();
  useTokenRefresh();

  // Initialize WebSocket and join project room
  useEffect(() => {
    webSocketService.init();

    // Join project room if project ID is configured
    const projectId = SKAFTIN_CONFIG.projectId;
    if (projectId) {
      webSocketService.joinProject(projectId);
    }

    return () => {
      webSocketService.disconnect();
    };
  }, []);

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
            
            {/* Onboarding - requires auth but no role check */}
            <Route path="/onboard" element={<ProtectedRoute><Onboard /></ProtectedRoute>} />
            
            {/* Protected app routes */}
            <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="companies" element={<Outlet />}>
                <Route index element={<CompaniesPage />} />
                <Route path="create" element={<CompanyFormPage />} />
                <Route path=":id" element={<CompanyDetailPage />} />
                <Route path=":id/edit" element={<CompanyFormPage />} />
              </Route>
              <Route path="invoices" element={<Outlet />}>
                <Route index element={<InvoiceListPage />} />
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
              <Route path="quotations" element={<Outlet />}>
                <Route index element={<QuotationListPage />} />
                <Route path="create" element={<QuotationFormPage />} />
                <Route path=":id" element={<QuotationDetailPage />} />
                <Route path=":id/edit" element={<QuotationFormPage />} />
              </Route>
              <Route path="payments" element={<Outlet />}>
                <Route index element={<PaymentsPage />} />
                <Route path="create" element={<PaymentFormPage />} />
              </Route>
              <Route path="statements" element={<StatementsPage />} />
              <Route path="settings" element={<SettingsPage />}>
                <Route index element={<BusinessSettingsTab />} />
                <Route path="banking" element={<BankingSettingsTab />} />
                <Route path="documents" element={<DocumentSettingsTab />} />
                <Route path="preferences" element={<PreferencesSettingsTab />} />
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
