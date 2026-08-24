/**
 * Auth Service
 * Register/login/logout against foro-api's JWT auth (`/api/v1/auth/*`).
 */

import { foroApiClient } from '../backend';
import useAuthStore from '../stores/data/AuthStore';
import { TokenManager } from './TokenManager';
import { API_CONFIG } from '../config/api.config';
import type { SessionUser } from '../types/Types';

export interface RegisterPayload {
  name: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

interface ApiUser {
  id: number;
  name: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isSuperAdmin?: boolean;
}

interface AuthTokensResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

function mapApiUserToSessionUser(payload: AuthTokensResponse): SessionUser {
  const { user, accessToken } = payload;
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ').trim() || user.name;

  return {
    id: user.id,
    email: user.email ?? '',
    accessToken,
    name: fullName,
    full_name: fullName,
    first_name: user.name,
    last_name: user.lastName ?? undefined,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin ?? false,
  };
}

/**
 * foro-api has no OTP/email-verification flow (unlike the old Skaftin backend).
 * Kept as `false` so callers built around this flag keep working unchanged.
 */
export function authPayloadNeedsOtpVerification(): boolean {
  return false;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<SessionUser> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await foroApiClient.post<AuthTokensResponse>(API_CONFIG.endpoints.register, {
        name: payload.name,
        lastName: payload.last_name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
      });
      if (!response.data?.user || !response.data?.accessToken) {
        throw new Error('Invalid register response');
      }

      const sessionUser = mapApiUserToSessionUser(response.data);
      TokenManager.setAccessToken(response.data.accessToken);
      TokenManager.setRefreshToken(response.data.refreshToken);
      store.login(sessionUser);
      store.setLoading(false);
      return sessionUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  async login(payload: LoginPayload): Promise<SessionUser> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await foroApiClient.post<AuthTokensResponse>(API_CONFIG.endpoints.login, {
        email: payload.username,
        password: payload.password,
      });
      if (!response.data?.user || !response.data?.accessToken) {
        throw new Error('Invalid login response');
      }

      const sessionUser = mapApiUserToSessionUser(response.data);
      TokenManager.setAccessToken(response.data.accessToken);
      TokenManager.setRefreshToken(response.data.refreshToken);
      store.login(sessionUser);
      store.setLoading(false);
      return sessionUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  logout(): void {
    void useAuthStore.getState().logout();
  },

  /**
   * None of the OTP / password-reset flows below exist on foro-api yet
   * (see foro-api/docs/api.md — only register/login/refresh/logout/me are
   * shipped). These throw a clear, user-facing error instead of calling a
   * nonexistent endpoint or leaving the OTP/reset pages crashing on an
   * undefined method.
   */
  async forgotPassword(_email: string): Promise<never> {
    throw new Error('Password reset is not available yet. Please contact support.');
  },

  async verifyOtp(_userId: number, _otp: string): Promise<never> {
    throw new Error('OTP verification is not available — this account is already active.');
  },

  async resendOtp(_userId: number, _method: 'email' | 'sms' = 'email'): Promise<never> {
    throw new Error('OTP verification is not available.');
  },

  async verifyForgotPasswordOtp(_email: string, _code: string): Promise<never> {
    throw new Error('Password reset is not available yet. Please contact support.');
  },

  async resetPasswordWithToken(_email: string, _resetToken: string, _newPassword: string): Promise<never> {
    throw new Error('Password reset is not available yet. Please contact support.');
  },

  getUser(): SessionUser | null {
    return useAuthStore.getState().sessionUser;
  },

  isAuthenticated(): boolean {
    const state = useAuthStore.getState();
    return !!(state.sessionUser?.accessToken || state.accessToken);
  },

  getToken(): string | null {
    return TokenManager.getAccessToken();
  },

  async verifySession(): Promise<boolean> {
    return useAuthStore.getState().verifySession();
  },
};
