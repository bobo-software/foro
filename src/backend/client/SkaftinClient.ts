/**
 * Skaftin SDK Client
 * Unified client for all Skaftin API interactions with automatic token refresh,
 * retry with exponential backoff, and request deduplication.
 */

import { SKAFTIN_CONFIG } from '../../config/skaftin.config';
import { TokenManager } from '../../services/TokenManager';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
}

export interface RefreshResponse {
  status: string;
  accessToken?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: Set<number>;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  retryableStatuses: new Set([408, 429, 502, 503, 504]),
};

const REQUEST_TIMEOUT_MS = 30_000;

export class SkaftinClient {
  private config: {
    apiUrl: string;
    apiKey: string;
    accessToken: string;
    projectId: string | null;
  };
  private initialized = false;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private failedRefreshSubscribers: Array<(error: Error) => void> = [];
  private inflightGets = new Map<string, Promise<any>>();
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    const apiUrl = SKAFTIN_CONFIG.apiUrl;
    const apiKey = SKAFTIN_CONFIG.apiKey;
    const accessToken = SKAFTIN_CONFIG.accessToken;
    const projectId = SKAFTIN_CONFIG.projectId;

    this.config = { apiUrl, apiKey, accessToken, projectId };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    if (!apiKey && !accessToken) {
      throw new Error('Skaftin credentials required. Set VITE_SKAFTIN_API_KEY or VITE_SKAFTIN_ACCESS_TOKEN');
    }

    if (import.meta.env.DEV) {
      console.log('🔧 Skaftin Client initialized');
    }

    this.initialized = true;
  }

  getApiUrl(): string {
    return this.config.apiUrl;
  }

  getProjectId(): string | null {
    return this.config.projectId;
  }

  isAuthenticated(): boolean {
    return !!(this.config.apiKey || this.config.accessToken);
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {};

    // Always include X-API-Key header (platform authentication)
    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    } else if (this.config.accessToken) {
      headers['x-access-token'] = this.config.accessToken;
    }

    return headers;
  }

  private buildHeaders(customHeaders: Record<string, string> = {}, isFormData = false): HeadersInit {
    const headers: Record<string, string> = {
      ...(this.getAuthHeaders() as Record<string, string>),
      ...customHeaders,
    };

    // Add Bearer token if available from TokenManager
    const jwtToken = TokenManager.getAccessToken();
    if (jwtToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    // CRITICAL: When using FormData, DO NOT set Content-Type header
    // The browser will automatically set it with the correct boundary
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (isFormData) {
      // Explicitly remove Content-Type if it was set by customHeaders
      delete headers['Content-Type'];
    }

    return headers;
  }

  /**
   * Subscribe to token refresh completion
   */
  private subscribeToTokenRefresh(
    onRefreshed: (token: string) => void,
    onFailed: (error: Error) => void
  ): void {
    this.refreshSubscribers.push(onRefreshed);
    this.failedRefreshSubscribers.push(onFailed);
  }

  /**
   * Notify all subscribers when token is refreshed
   */
  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
    this.failedRefreshSubscribers = [];
  }

  /**
   * Notify all subscribers when token refresh failed
   */
  private onTokenRefreshFailed(error: Error): void {
    this.failedRefreshSubscribers.forEach((callback) => callback(error));
    this.refreshSubscribers = [];
    this.failedRefreshSubscribers = [];
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const currentToken = TokenManager.getAccessToken();
    
    if (!currentToken) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}${SKAFTIN_CONFIG.endpoints.sessionRefresh}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'X-API-Key': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: RefreshResponse = await response.json();

      if (data.status === 'OK' && data.accessToken) {
        return data.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Handle 401 error with token refresh
   */
  private async handle401<T>(
    endpoint: string,
    options: RequestInit,
    isFormData: boolean
  ): Promise<ApiResponse<T> | null> {
    // Don't refresh for auth endpoints (login, register, etc.)
    const isAuthEndpoint = endpoint.includes('/auth/auth/');
    if (isAuthEndpoint) {
      return null;
    }

    // If already refreshing, queue this request
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.subscribeToTokenRefresh(
          async (token: string) => {
            try {
              // Retry the request with new token
              const result = await this.executeRequest<T>(endpoint, options, isFormData, token);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          (error: Error) => {
            reject(error);
          }
        );
      });
    }

    this.isRefreshing = true;

    try {
      const newToken = await this.refreshAccessToken();
      
      if (newToken) {
        TokenManager.setAccessToken(newToken);
        
        // Notify all queued requests
        this.onTokenRefreshed(newToken);

        // Retry original request with new token
        return await this.executeRequest<T>(endpoint, options, isFormData, newToken);
      }

      // Refresh failed - dispatch logout event
      TokenManager.clearAll();
      this.onTokenRefreshFailed(new Error('Session expired'));
      
      // Dispatch event for auth state listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout', { 
          detail: { reason: 'session_expired' } 
        }));
      }
      
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Execute the actual request
   */
  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit,
    isFormData: boolean,
    overrideToken?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    const headers = this.buildHeaders(
      (options.headers as Record<string, string>) || {},
      isFormData
    );

    // Override token if provided (for retry after refresh)
    if (overrideToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${overrideToken}`;
    }

    let finalBody: BodyInit | undefined;
    if (isFormData) {
      finalBody = options.body as FormData;
    } else if (options.body) {
      finalBody = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    const response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include',
      body: finalBody,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || data.error || `Request failed: ${response.status}`);
      (error as any).status = response.status;
      (error as any).data = data;
      throw error;
    }

    return data;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * 2 ** attempt;
    const jitter = delay * 0.2 * Math.random();
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  private isRetryable(error: any): boolean {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') return true;
    if (error.message === 'Failed to fetch') return true;
    if (error.status && this.retryConfig.retryableStatuses.has(error.status)) return true;
    return false;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    if (!this.initialized) throw new Error('Skaftin client not initialized');

    const url = `${this.config.apiUrl}${endpoint}`;
    const method = options.method || 'GET';
    const isFormData = options.body instanceof FormData;

    const headers = this.buildHeaders(
      (options.headers as Record<string, string>) || {},
      isFormData
    );

    let finalBody: BodyInit | undefined;
    if (isFormData) {
      finalBody = options.body as FormData;
    } else if (options.body) {
      finalBody = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    let lastError: any;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers,
          credentials: 'include',
          body: finalBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.status === 401) {
          const retryResult = await this.handle401<T>(endpoint, options, isFormData);
          if (retryResult) return retryResult;
          const error = new Error(data.message || data.error || 'Unauthorized');
          (error as any).status = 401;
          (error as any).data = data;
          throw error;
        }

        if (!response.ok) {
          const error = new Error(data.message || data.error || `Request failed: ${response.status}`);
          (error as any).status = response.status;
          (error as any).data = data;

          if (this.retryConfig.retryableStatuses.has(response.status) && attempt < this.retryConfig.maxRetries) {
            lastError = error;
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw error;
        }

        return data;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;

        if (this.isRetryable(error) && attempt < this.retryConfig.maxRetries) {
          if (import.meta.env.DEV) {
            console.warn(`[${method}] ${endpoint} retry ${attempt + 1}/${this.retryConfig.maxRetries}`, error.message);
          }
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }

        if (import.meta.env.DEV) {
          console.error(`[${method}] ${endpoint} ❌`, error);
        }
        throw error;
      }
    }

    throw lastError;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (params && Object.keys(params).length > 0) {
      const query = new URLSearchParams(
        Object.entries(params).reduce((acc, [k, v]) => {
          if (v !== undefined && v !== null) {
            acc[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      url += `?${query}`;
    }

    const inflight = this.inflightGets.get(url);
    if (inflight) return inflight;

    const promise = this.request<T>(url, { method: 'GET' }).finally(() => {
      this.inflightGets.delete(url);
    });
    this.inflightGets.set(url, promise);
    return promise;
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', body });
  }

  /**
   * Upload file using FormData
   * 
   * IMPORTANT: When using FormData, the Content-Type header is automatically
   * set by the browser with the correct boundary. Do NOT set it manually.
   */
  async postFormData<T>(endpoint: string, body: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }
}

export const skaftinClient = new SkaftinClient();
export default skaftinClient;
