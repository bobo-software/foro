import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import { SessionUser } from '../../types/Types';
import { TokenManager } from '../../services/TokenManager';
import { API_CONFIG } from '../../config/api.config';
import { foroApiClient } from '../../backend';

interface AuthState {
  // State
  sessionUser: SessionUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  /** foro-api has no OTP flow; kept so existing consumers of this flag keep working. Always false. */
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
}

interface MeResponseData {
  id: number;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isSuperAdmin?: boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionUser: null,
      accessToken: null,
      isLoading: false,
      error: null,
      requiresOtpVerification: false,
      rememberMe: true,

      login: (userData: SessionUser) => {
        const token = userData.accessToken;
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

      logout: async () => {
        try {
          const refreshToken = TokenManager.getRefreshToken();
          if (refreshToken) {
            await foroApiClient.post(API_CONFIG.endpoints.logout, { refreshToken });
          }
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

      verifySession: async (): Promise<boolean> => {
        const token = TokenManager.getAccessToken();
        const { sessionUser } = get();

        if (!token && !sessionUser?.accessToken) {
          set({ sessionUser: null, accessToken: null, isLoading: false });
          return false;
        }

        if (!token && sessionUser?.accessToken) {
          TokenManager.setAccessToken(sessionUser.accessToken);
        }

        set({ isLoading: true });

        try {
          const response = await foroApiClient.get<MeResponseData>(API_CONFIG.endpoints.me);

          if (response.success && response.data) {
            const user = response.data;
            const fullName = [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.name;

            const updatedUser: SessionUser = {
              ...sessionUser,
              id: user.id,
              email: user.email ?? '',
              name: fullName,
              full_name: fullName,
              first_name: user.name,
              last_name: user.lastName ?? undefined,
              phone: user.phone,
              isSuperAdmin: user.isSuperAdmin ?? false,
              accessToken: token || sessionUser?.accessToken || '',
            };

            set({
              sessionUser: updatedUser,
              accessToken: token,
              isLoading: false,
              error: null,
            });
            return true;
          }

          TokenManager.clearAll();
          set({ sessionUser: null, accessToken: null, isLoading: false });
          return false;
        } catch {
          TokenManager.clearAll();
          set({ sessionUser: null, accessToken: null, isLoading: false });
          return false;
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      clearError: () => set({ error: null }),
      setRequiresOtpVerification: (requires: boolean) => set({ requiresOtpVerification: requires }),
      setUser: (user: SessionUser | null) => set({ sessionUser: user }),
      setRememberMe: (value: boolean) => set({ rememberMe: value }),
    }),
    {
      name: API_CONFIG.authStorageKey,
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
            typeof window !== 'undefined' && !!window.sessionStorage.getItem('_fm_sess');
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

// Listen for auth:logout events (from ForoApiClient on session expiry)
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    const state = useAuthStore.getState();
    if (state.sessionUser) {
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
