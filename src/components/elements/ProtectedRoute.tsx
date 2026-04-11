import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/data/AuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required roles (user must have at least one)
   */
  requiredRoles?: string[];
  /**
   * Require ALL roles instead of ANY
   */
  requireAllRoles?: boolean;
  /**
   * Redirect path for unauthenticated users
   */
  loginPath?: string;
  /**
   * Redirect path for unauthorized users (wrong role)
   */
  unauthorizedPath?: string;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Custom unauthorized component
   */
  unauthorizedComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRoles = [],
  requireAllRoles = false,
  loginPath = '/login',
  unauthorizedPath = '/unauthorized',
  loadingComponent,
  unauthorizedComponent,
}: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const requiresOtpVerification = useAuthStore((s) => s.requiresOtpVerification);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasAnyRole = useAuthStore((s) => s.hasAnyRole);
  const hasAllRoles = useAuthStore((s) => s.hasAllRoles);

  const isAuthenticated = !!(accessToken || sessionUser?.accessToken);

  // Show loading while checking auth
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Email / SMS OTP must be completed before onboarding or the app shell
  if (requiresOtpVerification) {
    return (
      <Navigate
        to="/verify-otp"
        replace
        state={{
          email: sessionUser?.email,
          userId: sessionUser?.id != null ? Number(sessionUser.id) : undefined,
        }}
      />
    );
  }

  // Check roles if specified
  if (requiredRoles.length > 0) {
    const hasRequiredRoles = requireAllRoles
      ? hasAllRoles(requiredRoles)
      : hasAnyRole(requiredRoles);

    if (!hasRequiredRoles) {
      if (unauthorizedComponent) {
        return <>{unauthorizedComponent}</>;
      }
      return <Navigate to={unauthorizedPath} replace />;
    }
  }

  return <>{children}</>;
}

/**
 * HOC for class components or simple wrapping
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;
