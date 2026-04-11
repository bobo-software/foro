/**
 * Auth Service
 * Register and login via Skaftin app-api auth (SuperTokens).
 */

import { skaftinClient } from '../backend';
import useAuthStore from '../stores/data/AuthStore';
import { TokenManager } from './TokenManager';
import { SKAFTIN_CONFIG } from '../config/skaftin.config';
import type { SessionUser } from '../types/Types';

export interface RegisterPayload {
  name: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
  /** Optional role ID (see `01-AUTH-REQUESTS.md`); server applies default if omitted */
  role_id?: number;
  metadata?: Record<string, unknown>;
  otp_method?: 'email' | 'sms' | null;
}

export interface LoginPayload {
  username: string;
  password: string;
  method: 'email' | 'phone' | 'custom_field_1' | 'custom_field_2';
}

interface AuthResponseUser {
  id: number;
  name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  is_active?: boolean;
  email_verified?: boolean;
  roles?: Array<{ id: number; role_name: string; role_key: string }>;
}

interface AuthResponseSession {
  accessToken: string;
}

interface AuthResponseData {
  user: AuthResponseUser;
  /** Some app-api responses nest the JWT here */
  session?: AuthResponseSession;
  /** Skaftin register/login often returns the JWT alongside user at this level */
  accessToken?: string;
  organisation_id?: number;
  organisation_name?: string;
  organisation?: { id: number; name: string; is_admin?: boolean };
  is_admin?: boolean;
  requires_otp_verification?: boolean;
  otp_method?: string;
}

function accessTokenFromAuthData(data: AuthResponseData): string {
  return data.session?.accessToken ?? data.accessToken ?? '';
}

/**
 * Whether the user must complete registration OTP before using the app.
 * Matches `01-AUTH-REQUESTS.md`: pending registration OTP uses `is_active: false`;
 * also treats explicit `email_verified: false` as pending when the API sends it.
 */
export function authPayloadNeedsOtpVerification(payload: {
  requires_otp_verification?: boolean;
  user?: { email_verified?: boolean; is_active?: boolean };
}): boolean {
  if (payload.requires_otp_verification === false) return false;
  if (payload.requires_otp_verification === true) return true;
  const u = payload.user;
  if (!u) return false;
  if (u.is_active === false) return true;
  if (u.email_verified === false) return true;
  return false;
}

function mapAuthResponseToSessionUser(data: AuthResponseData): SessionUser {
  const user = data.user;
  const token = accessTokenFromAuthData(data);
  const orgId = data.organisation_id ?? data.organisation?.id ?? 0;
  const orgName = data.organisation_name ?? data.organisation?.name ?? '';
  const role = user.roles?.[0]?.role_key ?? '';
  const name = user.name ?? user.full_name ?? '';
  const fullName = [name, user.last_name].filter(Boolean).join(' ').trim() || name;

  return {
    id: user.id,
    email: user.email,
    accessToken: token,
    access: token,
    association: orgId,
    association_name: orgName,
    role,
    name: fullName || user.email,
    full_name: fullName,
    last_name: user.last_name,
    first_name: user.name,
    phone: user.phone ?? null,
    is_active: user.is_active,
    email_verified: user.email_verified,
    roles: user.roles,
    is_admin: data.is_admin ?? data.organisation?.is_admin ?? false,
  };
}

export interface RegisterResult {
  requiresOtp: boolean;
  email?: string;
  userId?: number;
  sessionUser?: SessionUser;
}

export const authService = {
  /**
   * Register a new user
   */
  async register(payload: RegisterPayload): Promise<RegisterResult> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const registerBody: Record<string, unknown> = {
        name: payload.name,
        last_name: payload.last_name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        metadata: payload.metadata,
        otp_method: payload.otp_method ?? 'email',
      };
      if (payload.role_id != null) registerBody.role_id = payload.role_id;

      const response = await skaftinClient.post<AuthResponseData>(
        SKAFTIN_CONFIG.endpoints.register,
        registerBody
      );
      const data = response.data;
      if (!data?.user) {
        throw new Error('Invalid register response');
      }

      const sessionUser = accessTokenFromAuthData(data)
        ? mapAuthResponseToSessionUser(data)
        : undefined;

      const needsOtp = authPayloadNeedsOtpVerification(data);

      if (needsOtp) {
        if (sessionUser) {
          TokenManager.setAccessToken(sessionUser.accessToken);
          store.login(sessionUser);
        }
        store.setRequiresOtpVerification(true);
        store.setLoading(false);
        return {
          requiresOtp: true,
          email: payload.email,
          userId: data.user.id,
        };
      }

      if (!sessionUser) throw new Error('Invalid register response');

      TokenManager.setAccessToken(sessionUser.accessToken);
      store.login(sessionUser);
      store.setLoading(false);
      return { requiresOtp: false, sessionUser };
    } catch (err: any) {
      const message = err.message || 'Registration failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Verify registration OTP (`POST .../verify-otp`).
   * Response is empty `data` per API docs; reuses the existing access token from register when present.
   * Returns updated session user if still logged in, otherwise null (caller should send user to login).
   */
  async verifyOtp(userId: number, otp: string): Promise<SessionUser | null> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await skaftinClient.post<Record<string, unknown>>(
        SKAFTIN_CONFIG.endpoints.verifyOtp,
        { user_id: userId, otp }
      );

      if (!response.success) {
        throw new Error(
          (response as { message?: string }).message || 'OTP verification failed'
        );
      }

      store.setRequiresOtpVerification(false);

      const prev = store.sessionUser;
      const token = TokenManager.getAccessToken() || prev?.accessToken;
      if (prev && token) {
        const updated: SessionUser = {
          ...prev,
          email_verified: true,
          is_active: true,
        };
        TokenManager.setAccessToken(token);
        store.setUser(updated);
        store.setLoading(false);
        return updated;
      }

      store.setLoading(false);
      return null;
    } catch (err: any) {
      const message = err.message || 'OTP verification failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Resend OTP code
   */
  async resendOtp(userId: number, method: 'email' | 'sms' = 'email'): Promise<void> {
    const endpoint = SKAFTIN_CONFIG.endpoints.resendOtp.replace('{userId}', String(userId));
    await skaftinClient.post(endpoint, { method });
  },

  /**
   * Login with credentials
   */
  async login(payload: LoginPayload): Promise<SessionUser> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await skaftinClient.post<AuthResponseData>(
        SKAFTIN_CONFIG.endpoints.login,
        {
          credential: payload.username,
          password: payload.password,
          method: payload.method,
        }
      );
      const data = response.data;
      if (!data?.user || !accessTokenFromAuthData(data)) {
        throw new Error('Invalid login response');
      }

      const sessionUser = mapAuthResponseToSessionUser(data);
      TokenManager.setAccessToken(sessionUser.accessToken);
      store.login(sessionUser);
      if (authPayloadNeedsOtpVerification(data)) {
        store.setRequiresOtpVerification(true);
      }
      store.setLoading(false);
      return sessionUser;
    } catch (err: any) {
      const message = err.message || 'Login failed';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Logout
   */
  logout(): void {
    useAuthStore.getState().logout();
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ method: string; destination: string }> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await skaftinClient.post<{
        data?: { method?: string; destination?: string };
        method?: string;
        destination?: string;
      }>(SKAFTIN_CONFIG.endpoints.forgotPassword, { email, method: 'email' });
      
      const data = (response as any).data ?? response;
      store.setLoading(false);
      return {
        method: data?.method ?? 'email',
        destination: data?.destination ?? email,
      };
    } catch (err: any) {
      const message = err.message || 'Failed to send reset email';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Verify forgot password OTP
   */
  async verifyForgotPasswordOtp(
    email: string,
    code: string
  ): Promise<{ reset_token: string; expires_in_minutes: number }> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      const response = await skaftinClient.post<{
        data?: { reset_token?: string; expires_in_minutes?: number };
        reset_token?: string;
        expires_in_minutes?: number;
      }>(SKAFTIN_CONFIG.endpoints.verifyForgotPasswordOtp, { email, otp: code });
      
      const data = (response as any).data ?? response;
      const token = data?.reset_token;
      if (!token) throw new Error('Invalid verify response');
      
      store.setLoading(false);
      return {
        reset_token: token,
        expires_in_minutes: data?.expires_in_minutes ?? 15,
      };
    } catch (err: any) {
      const message = err.message || 'Failed to verify code';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Reset password with token
   */
  async resetPasswordWithToken(
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<void> {
    const store = useAuthStore.getState();
    store.setLoading(true);
    store.clearError();

    try {
      await skaftinClient.post(SKAFTIN_CONFIG.endpoints.resetPassword, {
        email,
        reset_token: resetToken,
        new_password: newPassword,
      });
      store.setLoading(false);
    } catch (err: any) {
      const message = err.message || 'Failed to reset password';
      store.setError(message);
      store.setLoading(false);
      throw err;
    }
  },

  /**
   * Get current user from store
   */
  getUser(): SessionUser | null {
    return useAuthStore.getState().sessionUser;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = useAuthStore.getState();
    return !!(state.sessionUser?.accessToken || state.accessToken);
  },

  /**
   * Get current access token
   */
  getToken(): string | null {
    return TokenManager.getAccessToken();
  },

  /**
   * Check if user has role
   */
  hasRole(roleKey: string): boolean {
    return useAuthStore.getState().hasRole(roleKey);
  },

  /**
   * Verify current session
   */
  async verifySession(): Promise<boolean> {
    return useAuthStore.getState().verifySession();
  },
};
