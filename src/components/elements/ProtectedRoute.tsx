import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/data/AuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Redirect path for unauthenticated users
   */
  loginPath?: string;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  loginPath = '/login',
  loadingComponent,
}: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const isLoading = useAuthStore((s) => s.isLoading);

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
