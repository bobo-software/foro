/**
 * A small, self-contained client for the public client-statement portal
 * (`/api/v1/statement-portal/*`). Deliberately NOT the shared `ForoApiClient` —
 * that client hardcodes its token source to `TokenManager`'s `localStorage`
 * (the admin session). A contact session is a different credential entirely
 * (a distinct 24h JWT, no refresh token, no rotation) and must never share
 * storage with — or be confused with — an admin's login.
 */

import { API_CONFIG } from '../../config/api.config';
import { logger } from '../../utils/logger';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
  timestamp?: string;
}

const CONTACT_SESSION_TOKEN_KEY = 'foro_contact_session_token';

export interface HttpError extends Error {
  status?: number;
  data?: unknown;
}

function createHttpError(message: string, status: number, data: unknown): HttpError {
  const e = new Error(message) as HttpError;
  e.status = status;
  e.data = data;
  return e;
}

class StatementPortalApiClient {
  private readonly apiUrl = API_CONFIG.apiUrl;

  getToken(): string | null {
    try {
      return window.sessionStorage.getItem(CONTACT_SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    try {
      window.sessionStorage.setItem(CONTACT_SESSION_TOKEN_KEY, token);
    } catch {
      /* sessionStorage unavailable (private browsing etc.) — session just won't persist across reload */
    }
  }

  clearToken(): void {
    try {
      window.sessionStorage.removeItem(CONTACT_SESSION_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  hasSession(): boolean {
    return !!this.getToken();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body: BodyInit | undefined;
    if (options.body) {
      body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers, body });
    } catch (error) {
      logger.error(`[statement-portal] ${options.method ?? 'GET'} ${endpoint} network error`, error);
      throw error;
    }

    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok) {
      if (response.status === 401) this.clearToken();
      throw createHttpError(data.message || data.error || `Request failed: ${response.status}`, response.status, data);
    }
    return data;
  }

  get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: body as BodyInit | undefined });
  }
}

export const statementPortalApiClient = new StatementPortalApiClient();
export default statementPortalApiClient;
