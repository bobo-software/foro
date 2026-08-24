import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/data/AuthStore';
import { ProtectedRoute } from './ProtectedRoute';

interface RequireSuperAdminProps {
  children: React.ReactNode;
}

/**
 * Gates a route to superadmins only. Composes with ProtectedRoute for the
 * base authenticated-session check, then redirects non-superadmins to
 * /unauthorized.
 */
export function RequireSuperAdmin({ children }: RequireSuperAdminProps) {
  const sessionUser = useAuthStore((s) => s.sessionUser);

  return (
    <ProtectedRoute>
      {sessionUser?.isSuperAdmin ? <>{children}</> : <Navigate to="/unauthorized" replace />}
    </ProtectedRoute>
  );
}

export default RequireSuperAdmin;
