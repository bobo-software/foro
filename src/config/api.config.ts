// src/config/api.config.ts
import { env } from './env';

export const API_CONFIG = {
  // API URL - the foro-api backend instance
  apiUrl: env.VITE_API_URL,

  // WebSocket URL for the Socket.IO realtime layer
  wsUrl: env.VITE_WS_URL || env.VITE_API_URL,

  // Token storage keys (localStorage)
  tokenStorageKey: 'foro_access_token',
  refreshTokenStorageKey: 'foro_refresh_token',
  userStorageKey: 'foro_user',

  // Auth storage key (for Zustand persistence)
  authStorageKey: 'auth',

  // Session check interval (ms) - how often to verify session is valid
  sessionCheckInterval: 5 * 60 * 1000, // 5 minutes

  // Token refresh buffer (ms) - refresh token this much before expiry
  tokenRefreshBuffer: 60 * 1000, // 1 minute

  // API endpoints
  endpoints: {
    register: '/api/v1/auth/register',
    login: '/api/v1/auth/login',
    refresh: '/api/v1/auth/refresh',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
  },
} as const;

export type ApiConfig = typeof API_CONFIG;
