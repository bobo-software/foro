// src/hooks/useAuth.ts

import { useEffect } from 'react';
import useAuthStore from '../stores/data/AuthStore';

/**
 * Simple auth hook that directly uses the Zustand store
 * Use this if you don't need the AuthProvider pattern
 */
export function useAuth() {
  const store = useAuthStore();

  // Verify session on first use if we have a token but aren't sure about auth
  useEffect(() => {
    const hasToken = store.accessToken || store.sessionUser?.accessToken;
    if (hasToken && !store.isLoading) {
      // Optionally verify session on mount
      // Uncomment if you want automatic verification
      // store.verifySession();
    }
  }, []);

  const isAuthenticated = !!(store.sessionUser?.accessToken || store.accessToken);

  return {
    // State
    user: store.sessionUser,
    isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    requiresOtpVerification: store.requiresOtpVerification,

    // Actions
    login: store.login,
    logout: store.logout,
    verifySession: store.verifySession,
    clearError: store.clearError,
    setError: store.setError,
    setLoading: store.setLoading,
  };
}

export default useAuth;
