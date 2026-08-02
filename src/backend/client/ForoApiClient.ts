/**
 * foro-api Client
 * Unified client for all foro-api interactions with automatic token refresh,
 * retry with exponential backoff, and request deduplication.
 */

import { API_CONFIG } from '../../config/api.config';
import { TokenManager } from '../../services/TokenManager';
import { logger } from '../../utils/logger';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
  timestamp?: string;
}

interface RefreshResponseData {
  accessToken: string;
  refreshToken: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: Set<number>;
}

interface HttpError extends Error {
  status?: number;
  data?: unknown;
}

function createHttpError(message: string, status: number, data: unknown): HttpError {
  const e = new Error(message) as HttpError;
  e.status = status;
  e.data = data;
  return e;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  retryableStatuses: new Set([408, 429, 502, 503, 504]),
};

const REQUEST_TIMEOUT_MS = 30_000;

export class ForoApiClient {
  private apiUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private failedRefreshSubscribers: Array<(error: Error) => void> = [];
  private inflightGets = new Map<string, Promise<unknown>>();
  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.apiUrl = API_CONFIG.apiUrl;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    logger.log('🔧 foro-api client initialized');
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  private buildHeaders(customHeaders: Record<string, string> = {}, isFormData = false): HeadersInit {
    const headers: Record<string, string> = { ...customHeaders };

    const jwtToken = TokenManager.getAccessToken();
    if (jwtToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${jwtToken}`;
    }

    // CRITICAL: When using FormData, DO NOT set Content-Type header.
    // The browser will automatically set it with the correct boundary.
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (isFormData) {
      delete headers['Content-Type'];
    }

    return headers;
  }

  private subscribeToTokenRefresh(
    onRefreshed: (token: string) => void,
    onFailed: (error: Error) => void
  ): void {
    this.refreshSubscribers.push(onRefreshed);
    this.failedRefreshSubscribers.push(onFailed);
  }

  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
    this.failedRefreshSubscribers = [];
  }

  private onTokenRefreshFailed(error: Error): void {
    this.failedRefreshSubscribers.forEach((callback) => callback(error));
    this.refreshSubscribers = [];
    this.failedRefreshSubscribers = [];
  }

  private async refreshAccessToken(): Promise<RefreshResponseData | null> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.apiUrl}${API_CONFIG.endpoints.refresh}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const body: ApiResponse<RefreshResponseData> = await response.json();
      if (body.success && body.data?.accessToken && body.data?.refreshToken) {
        return body.data;
      }
      return null;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      return null;
    }
  }

  private async handle401<T>(
    endpoint: string,
    options: RequestInit,
    isFormData: boolean
  ): Promise<ApiResponse<T> | null> {
    // Only skip refresh-and-retry for endpoints where it can't possibly help:
    // login/register (401 means bad credentials, not an expired session) and
    // refresh itself (avoids refreshing-the-refresh-call recursion). Other
    // /auth/* endpoints like `me` and `logout` are normal authenticated calls
    // and should get the same silent-refresh treatment as any other route.
    const noRefreshEndpoints: string[] = [
      API_CONFIG.endpoints.login,
      API_CONFIG.endpoints.register,
      API_CONFIG.endpoints.refresh,
    ];
    if (noRefreshEndpoints.includes(endpoint)) {
      return null;
    }

    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.subscribeToTokenRefresh(
          async (token: string) => {
            try {
              const result = await this.executeRequest<T>(endpoint, options, isFormData, token);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          },
          (error: Error) => reject(error)
        );
      });
    }

    this.isRefreshing = true;

    try {
      const refreshed = await this.refreshAccessToken();

      if (refreshed) {
        TokenManager.setAccessToken(refreshed.accessToken);
        TokenManager.setRefreshToken(refreshed.refreshToken);

        this.onTokenRefreshed(refreshed.accessToken);

        return await this.executeRequest<T>(endpoint, options, isFormData, refreshed.accessToken);
      }

      TokenManager.clearAll();
      this.onTokenRefreshFailed(new Error('Session expired'));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'session_expired' } }));
      }

      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async executeRequest<T>(
    endpoint: string,
    options: RequestInit,
    isFormData: boolean,
    overrideToken?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;
    const method = options.method || 'GET';

    const headers = this.buildHeaders((options.headers as Record<string, string>) || {}, isFormData);

    if (overrideToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${overrideToken}`;
    }

    let finalBody: BodyInit | undefined;
    if (isFormData) {
      finalBody = options.body as FormData;
    } else if (options.body) {
      finalBody = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, { ...options, method, headers, body: finalBody });
    const data = await response.json();

    if (!response.ok) {
      throw createHttpError(data.message || data.error || `Request failed: ${response.status}`, response.status, data);
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

  private isRetryable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const e = error as HttpError;
    if (e.name === 'AbortError' || e.name === 'TimeoutError') return true;
    if (e.message === 'Failed to fetch') return true;
    if (e.status && this.retryConfig.retryableStatuses.has(e.status)) return true;
    return false;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;
    const method = options.method || 'GET';
    const isFormData = options.body instanceof FormData;

    const headers = this.buildHeaders((options.headers as Record<string, string>) || {}, isFormData);

    let finalBody: BodyInit | undefined;
    if (isFormData) {
      finalBody = options.body as FormData;
    } else if (options.body) {
      finalBody = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers,
          body: finalBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (response.status === 401) {
          const retryResult = await this.handle401<T>(endpoint, options, isFormData);
          if (retryResult) return retryResult;
          throw createHttpError(data.message || data.error || 'Unauthorized', 401, data);
        }

        if (!response.ok) {
          const error = createHttpError(data.message || data.error || `Request failed: ${response.status}`, response.status, data);

          if (this.retryConfig.retryableStatuses.has(response.status) && attempt < this.retryConfig.maxRetries) {
            lastError = error;
            await this.sleep(this.getRetryDelay(attempt));
            continue;
          }

          throw error;
        }

        return data;
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        lastError = error;

        if (this.isRetryable(error) && attempt < this.retryConfig.maxRetries) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.warn(`[${method}] ${endpoint} retry ${attempt + 1}/${this.retryConfig.maxRetries}`, msg);
          await this.sleep(this.getRetryDelay(attempt));
          continue;
        }

        logger.error(`[${method}] ${endpoint} ❌`, error);
        throw error;
      }
    }

    throw lastError;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
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
    if (inflight) return inflight as Promise<ApiResponse<T>>;

    const promise = this.request<T>(url, { method: 'GET' }).finally(() => {
      this.inflightGets.delete(url);
    });
    this.inflightGets.set(url, promise);
    return promise;
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: body as BodyInit | undefined });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: body as BodyInit | undefined });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: body as BodyInit | undefined });
  }

  async delete<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE', body: body as BodyInit | undefined });
  }

  /**
   * Upload file using FormData. Content-Type is set automatically by the
   * browser with the correct multipart boundary — do not set it manually.
   */
  async postFormData<T>(endpoint: string, body: FormData): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }
}

export const foroApiClient = new ForoApiClient();
export default foroApiClient;
