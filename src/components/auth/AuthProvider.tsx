// src/components/AuthProvider.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import useAuthStore from '../../stores/data/AuthStore';
import type { SessionUser } from '../../types/Types';

interface AuthContextType {
  user: SessionUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  requiresOtpVerification: boolean;
  login: (userData: SessionUser) => void;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  /**
   * Whether to verify session on mount (default: true)
   */
  verifyOnMount?: boolean;
  /**
   * Loading component to show while initializing
   */
  loadingComponent?: ReactNode;
}

export function AuthProvider({
  children,
  verifyOnMount = true,
  loadingComponent,
}: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    sessionUser,
    accessToken,
    isLoading,
    error,
    requiresOtpVerification,
    login,
    logout,
    verifySession,
    clearError,
  } = useAuthStore();

  // Check if user is authenticated
  const isAuthenticated = !!(sessionUser?.accessToken || accessToken);

  // Verify session on mount
  useEffect(() => {
    const initAuth = async () => {
      if (verifyOnMount && isAuthenticated) {
        await verifySession();
      }
      setIsInitialized(true);
    };

    initAuth();
  }, [verifyOnMount]); // Only run once on mount

  // Show loading while initializing
  if (!isInitialized) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  const contextValue: AuthContextType = {
    user: sessionUser,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    requiresOtpVerification,
    login,
    logout,
    verifySession,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook to access auth state directly from store (without provider)
 * Useful for non-React contexts or when you need direct store access
 */
export function useAuthState() {
  return useAuthStore();
}

export default AuthProvider;
