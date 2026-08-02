// src/services/TokenManager.ts

import { API_CONFIG } from '../config/api.config';

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

interface TokenManagerOptions {
  storageType?: StorageType;
  tokenKey?: string;
  refreshTokenKey?: string;
  userKey?: string;
}

class TokenManagerClass {
  private storageType: StorageType = 'localStorage';
  private tokenKey: string;
  private refreshTokenKey: string;
  private userKey: string;

  // Memory storage fallback (for SSR or when localStorage is unavailable)
  private memoryStore: Map<string, string> = new Map();

  constructor(options: TokenManagerOptions = {}) {
    this.storageType = options.storageType || 'localStorage';
    this.tokenKey = options.tokenKey || API_CONFIG.tokenStorageKey;
    this.refreshTokenKey = options.refreshTokenKey || API_CONFIG.refreshTokenStorageKey;
    this.userKey = options.userKey || API_CONFIG.userStorageKey;
  }

  /**
   * Configure storage type at runtime
   */
  setStorageType(type: StorageType): void {
    this.storageType = type;
  }

  /**
   * Get the storage mechanism based on configuration
   */
  private getStorage(): Storage | Map<string, string> {
    if (typeof window === 'undefined') {
      return this.memoryStore;
    }

    switch (this.storageType) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      case 'memory':
        return this.memoryStore;
      default:
        return window.localStorage;
    }
  }

  /**
   * Get item from storage
   */
  private getItem(key: string): string | null {
    const storage = this.getStorage();
    if (storage instanceof Map) {
      return storage.get(key) || null;
    }
    return storage.getItem(key);
  }

  /**
   * Set item in storage
   */
  private setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage instanceof Map) {
      storage.set(key, value);
    } else {
      storage.setItem(key, value);
    }
  }

  /**
   * Remove item from storage
   */
  private removeItem(key: string): void {
    const storage = this.getStorage();
    if (storage instanceof Map) {
      storage.delete(key);
    } else {
      storage.removeItem(key);
    }
  }

  // ============================================
  // ACCESS TOKEN METHODS
  // ============================================

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.getItem(this.tokenKey);
  }

  /**
   * Store an access token
   */
  setAccessToken(token: string): void {
    this.setItem(this.tokenKey, token);
  }

  /**
   * Check if a token exists
   */
  hasToken(): boolean {
    return !!this.getAccessToken();
  }

  // ============================================
  // REFRESH TOKEN METHODS
  // ============================================

  getRefreshToken(): string | null {
    return this.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    this.setItem(this.refreshTokenKey, token);
  }

  clearRefreshToken(): void {
    this.removeItem(this.refreshTokenKey);
  }

  /**
   * Parse JWT token to get payload (without verification)
   * Note: This is for client-side inspection only, not security validation
   */
  parseToken(token?: string): Record<string, any> | null {
    const tokenToParse = token || this.getAccessToken();
    if (!tokenToParse) return null;

    try {
      const parts = tokenToParse.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(bufferMs: number = 0): boolean {
    const payload = this.parseToken();
    if (!payload || !payload.exp) return true;
    
    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiryTime - bufferMs;
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(): Date | null {
    const payload = this.parseToken();
    if (!payload || !payload.exp) return null;
    return new Date(payload.exp * 1000);
  }

  /**
   * Get time until token expires (in ms)
   */
  getTimeUntilExpiry(): number | null {
    const payload = this.parseToken();
    if (!payload || !payload.exp) return null;
    const expiryTime = payload.exp * 1000;
    return Math.max(0, expiryTime - Date.now());
  }

  // ============================================
  // USER DATA METHODS
  // ============================================

  /**
   * Get stored user data
   */
  getUser<T = any>(): T | null {
    const userData = this.getItem(this.userKey);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as T;
    } catch {
      return null;
    }
  }

  /**
   * Store user data
   */
  setUser<T = any>(user: T): void {
    this.setItem(this.userKey, JSON.stringify(user));
  }

  // ============================================
  // CLEAR METHODS
  // ============================================

  /**
   * Clear the access token
   */
  clearToken(): void {
    this.removeItem(this.tokenKey);
  }

  /**
   * Clear user data
   */
  clearUser(): void {
    this.removeItem(this.userKey);
  }

  /**
   * Clear all auth data (logout)
   */
  clearAll(): void {
    this.clearToken();
    this.clearRefreshToken();
    this.clearUser();
  }
}

// Export singleton instance
export const TokenManager = new TokenManagerClass();

// Export class for custom instances
export { TokenManagerClass };
