// src/config/skaftin.config.ts
//
// DEPRECATED: bridging config for the handful of services not yet cut over
// to foro-api (see migration plan). Reads raw import.meta.env directly
// since these vars were intentionally dropped from env.ts's schema — do not
// add new usages of this file. Deleted once every consumer moves to
// api.config.ts.

export const SKAFTIN_CONFIG = {
  // API URL - your Skaftin backend instance
  apiUrl: import.meta.env.VITE_SKAFTIN_API_URL || 'http://localhost:4006',

  // API Key - identifies your project (get from Skaftin dashboard).
  // Falls back to a placeholder outside production so SkaftinClient's
  // constructor (which throws without any credential) doesn't crash test/dev
  // environments that never configured real Skaftin creds — matches the
  // fallback env.ts used to provide before these vars were dropped from it.
  apiKey:
    import.meta.env.VITE_SKAFTIN_API_KEY ||
    import.meta.env.VITE_SKAFTIN_API ||
    (import.meta.env.DEV || import.meta.env.MODE === 'test' ? 'dev_placeholder' : ''),

  // Access token (alternative to API key)
  accessToken: import.meta.env.VITE_SKAFTIN_ACCESS_TOKEN || '',

  // Project ID
  projectId: import.meta.env.VITE_SKAFTIN_PROJECT_ID || null,
  
  // Token storage key
  tokenStorageKey: 'skaftin_access_token',
  
  // User storage key  
  userStorageKey: 'skaftin_user',
  
  // Auth storage key (for Zustand persistence)
  authStorageKey: 'auth',
  
  // Session check interval (ms) - how often to verify session is valid
  sessionCheckInterval: 5 * 60 * 1000, // 5 minutes
  
  // Token refresh buffer (ms) - refresh token this much before expiry
  tokenRefreshBuffer: 60 * 1000, // 1 minute
  
  // API endpoints
  endpoints: {
    login: '/app-api/auth/auth/login',
    register: '/app-api/auth/auth/register',
    verify: '/app-api/auth/auth/verify',
    logout: '/app-api/auth/auth/logout',
    verifyOtp: '/app-api/auth/auth/verify-otp',
    resendOtp: '/app-api/auth/users/{userId}/resend-otp',
    forgotPassword: '/app-api/auth/auth/forgot-password',
    verifyForgotPasswordOtp: '/app-api/auth/auth/verify-forgot-password-otp',
    resetPassword: '/app-api/auth/auth/reset-password',
    sessionRefresh: '/app-api/auth/session/refresh',
    payments: {
      plans: '/app-api/payments/plans',
      initiate: '/app-api/payments/initiate',
      transaction: '/app-api/payments/transaction',
      cancelSubscription: '/app-api/payments/subscription/cancel',
    },
  },
} as const;

export type SkaftinConfig = typeof SKAFTIN_CONFIG;
