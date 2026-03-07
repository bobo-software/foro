// src/config/skaftin.config.ts
import { env } from './env';

export const SKAFTIN_CONFIG = {
  // API URL - your Skaftin backend instance
  apiUrl: env.VITE_SKAFTIN_API_URL,
  
  // API Key - identifies your project (get from Skaftin dashboard)
  apiKey: env.VITE_SKAFTIN_API_KEY || env.VITE_SKAFTIN_API || '',
  
  // Access token (alternative to API key)
  accessToken: env.VITE_SKAFTIN_ACCESS_TOKEN || '',
  
  // Project ID
  projectId: env.VITE_SKAFTIN_PROJECT_ID || null,
  
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
    forgotPassword: '/app-api/auth/forgot-password',
    verifyForgotPasswordOtp: '/app-api/auth/verify-forgot-password-otp',
    resetPassword: '/app-api/auth/reset-password',
    sessionRefresh: '/app-api/auth/session/refresh',
  },
} as const;

export type SkaftinConfig = typeof SKAFTIN_CONFIG;
