import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { SessionUser } from '../../types/Types';
import { TokenManager } from '../../services/TokenManager';
import { SKAFTIN_CONFIG } from '../../config/skaftin.config';
import { skaftinClient } from '../../backend';

// Define Auth State interface
interface AuthState {
  // State
  sessionUser: SessionUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  requiresOtpVerification: boolean;
  rememberMe: boolean;

  // Actions
  login: (userData: SessionUser) => void;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setRequiresOtpVerification: (requires: boolean) => void;
  setUser: (user: SessionUser | null) => void;
  setRememberMe: (value: boolean) => void;
  
  // Role helpers
  hasRole: (roleKey: string) => boolean;
  hasAnyRole: (roleKeys: string[]) => boolean;
  hasAllRoles: (roleKeys: string[]) => boolean;
  isAdmin: () => boolean;
}

// Normalize role_key for consistent comparison (backend uses lowercase)
const normalizeRoleKey = (key: string) => (key || '').toLowerCase().trim();

// Zustand store with persistence
const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessionUser: null,
      accessToken: null,
      isLoading: false,
      error: null,
      requiresOtpVerification: false,
      rememberMe: true,

      // ============================================
      // ACTIONS
      // ============================================

      /**
       * Login - store user data and token
       */
      login: (userData: SessionUser) => {
        const token = userData.accessToken || userData.access;
        
        // Store token in TokenManager
        if (token) {
          TokenManager.setAccessToken(token);
        }
        
        set({ 
          sessionUser: userData,
          accessToken: token,
          isLoading: false,
          error: null,
          requiresOtpVerification: false,
        });
      },

      /**
       * Logout - clear session
       */
      logout: async () => {
        try {
          await skaftinClient.post(SKAFTIN_CONFIG.endpoints.logout);
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          TokenManager.clearAll();
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('_fm_sess');
          }
          set({
            sessionUser: null,
            accessToken: null,
            isLoading: false,
            error: null,
            requiresOtpVerification: false,
          });
          toast.success('Logged out successfully');
        }
      },

      /**
       * Verify current session is valid
       */
      verifySession: async (): Promise<boolean> => {
        const token = TokenManager.getAccessToken();
        const { sessionUser } = get();
        
        if (!token && !sessionUser?.accessToken) {
          set({ 
            sessionUser: null, 
            accessToken: null,
            isLoading: false,
          });
          return false;
        }

        // Ensure token is in TokenManager
        if (!token && sessionUser?.accessToken) {
          TokenManager.setAccessToken(sessionUser.accessToken);
        }

        set({ isLoading: true });

        try {
          const response = await skaftinClient.post<{ user: any; organisation?: any }>(
            SKAFTIN_CONFIG.endpoints.verify
          );

          if (response.success && response.data?.user) {
            const user = response.data.user;
            const org = response.data.organisation;
            
            // Update session user with fresh data
            const updatedUser: SessionUser = {
              ...sessionUser,
              id: user.id,
              email: user.email,
              name: user.name || user.full_name || sessionUser?.name,
              full_name: user.full_name || user.name,
              first_name: user.name,
              last_name: user.last_name,
              phone: user.phone,
              roles: user.roles,
              role: user.roles?.[0]?.role_key || sessionUser?.role || '',
              is_active: user.is_active,
              email_verified: user.email_verified ?? sessionUser?.email_verified,
              association: org?.id || sessionUser?.association || 0,
              association_name: org?.name || sessionUser?.association_name || '',
              is_admin: org?.is_admin || sessionUser?.is_admin || false,
              accessToken: token || sessionUser?.accessToken || '',
              access: token || sessionUser?.access || '',
            };

            set({
              sessionUser: updatedUser,
              accessToken: token,
              isLoading: false,
              error: null,
              requiresOtpVerification:
                user.email_verified === true ? false : get().requiresOtpVerification,
            });
            return true;
          }

          // Session invalid - clear everything
          TokenManager.clearAll();
          set({
            sessionUser: null,
            accessToken: null,
            isLoading: false,
          });
          return false;
        } catch {
          // Session verification failed
          TokenManager.clearAll();
          set({
            sessionUser: null,
            accessToken: null,
            isLoading: false,
          });
          return false;
        }
      },

      /**
       * Set loading state
       */
      setLoading: (loading: boolean) => set({ isLoading: loading }),

      /**
       * Set error state
       */
      setError: (error: string | null) => set({ error }),

      /**
       * Clear error state
       */
      clearError: () => set({ error: null }),

      /**
       * Set OTP verification requirement
       */
      setRequiresOtpVerification: (requires: boolean) => 
        set({ requiresOtpVerification: requires }),

      /**
       * Manually set user (for updates)
       */
      setUser: (user: SessionUser | null) => set({ sessionUser: user }),

      setRememberMe: (value: boolean) => set({ rememberMe: value }),

      // ============================================
      // ROLE HELPERS
      // ============================================

      /**
       * Check if user has a specific role
       */
      hasRole: (roleKey: string): boolean => {
        const user = get().sessionUser;
        if (!user) return false;
        const key = normalizeRoleKey(roleKey);
        if (user.roles?.length) {
          return user.roles.some((r) => normalizeRoleKey(r.role_key) === key);
        }
        return normalizeRoleKey(user.role) === key;
      },

      /**
       * Check if user has any of the specified roles
       */
      hasAnyRole: (roleKeys: string[]): boolean => {
        const user = get().sessionUser;
        if (!user) return false;
        const keys = roleKeys.map(normalizeRoleKey).filter(Boolean);
        if (user.roles?.length) {
          return user.roles.some((r) => keys.includes(normalizeRoleKey(r.role_key)));
        }
        return keys.includes(normalizeRoleKey(user.role));
      },

      /**
       * Check if user has all of the specified roles
       */
      hasAllRoles: (roleKeys: string[]): boolean => {
        const user = get().sessionUser;
        if (!user || !user.roles?.length) return false;
        const keys = roleKeys.map(normalizeRoleKey).filter(Boolean);
        return keys.every((key) => 
          user.roles!.some((r) => normalizeRoleKey(r.role_key) === key)
        );
      },

      /**
       * Check if user is admin
       */
      isAdmin: (): boolean => {
        const user = get().sessionUser;
        if (!user) return false;
        if (user.is_admin === true) return true;
        return get().hasAnyRole(['secretary', 'scholar_admin', 'Scholar_admin', 'scholar_owner', 'Scholar Owner', 'admin']);
      },
    }),
    {
      name: SKAFTIN_CONFIG.authStorageKey,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessionUser: state.sessionUser,
        accessToken: state.accessToken,
        requiresOtpVerification: state.requiresOtpVerification,
        rememberMe: state.rememberMe,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // If user did not choose "remember me", only keep session alive while
        // the browser tab/session is open (sessionStorage marker present).
        if (state.rememberMe === false) {
          const hasSession =
            typeof window !== 'undefined' &&
            !!window.sessionStorage.getItem('_fm_sess');
          if (!hasSession) {
            state.sessionUser = null;
            state.accessToken = null;
            TokenManager.clearAll();
            return;
          }
        }

        if (state.accessToken) {
          TokenManager.setAccessToken(state.accessToken);
        } else if (state.sessionUser?.accessToken) {
          TokenManager.setAccessToken(state.sessionUser.accessToken);
        }
      },
    }
  )
);

// Listen for auth:logout events (from SkaftinClient on session expiry)
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    const state = useAuthStore.getState();
    if (state.sessionUser) {
      // Clear state without calling API (session already expired)
      TokenManager.clearAll();
      useAuthStore.setState({
        sessionUser: null,
        accessToken: null,
        isLoading: false,
        error: 'Session expired. Please log in again.',
        requiresOtpVerification: false,
      });
      toast.error('Session expired. Please log in again.');
    }
  });
}

export default useAuthStore;
