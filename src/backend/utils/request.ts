/**
 * Request Utilities
 * Backward compatibility wrapper for HTTP requests
 * Delegates to SkaftinClient
 */

import { skaftinClient, ApiResponse } from '../client/SkaftinClient';

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface ErrorLike {
  message?: string;
  status?: number;
  data?: unknown;
}

function toErrorLike(e: unknown): ErrorLike {
  if (typeof e === 'object' && e !== null) return e as ErrorLike;
  return { message: String(e) };
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): never {
  if (error instanceof ApiError) {
    throw error;
  }

  const e = toErrorLike(error);

  if (e.status) {
    throw new ApiError(
      e.message || `Request failed with status ${e.status}`,
      e.status,
      e.data
    );
  }

  throw new ApiError(e.message || 'An unexpected error occurred');
}

/**
 * Generic API request wrapper
 */
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  try {
    const { method = 'GET', body } = options;

    switch (method.toUpperCase()) {
      case 'GET':
        return await skaftinClient.get<T>(endpoint, body as Record<string, unknown>);
      case 'POST':
        return await skaftinClient.post<T>(endpoint, body);
      case 'PUT':
        return await skaftinClient.put<T>(endpoint, body);
      case 'PATCH':
        return await skaftinClient.patch<T>(endpoint, body);
      case 'DELETE':
        return await skaftinClient.delete<T>(endpoint, body);
      default:
        return await skaftinClient.request<T>(endpoint, {
          method: options.method,
          body: body as BodyInit | undefined,
          headers: options.headers as HeadersInit,
        });
    }
  } catch (error: unknown) {
    handleApiError(error);
    throw error; // This won't be reached but satisfies TypeScript
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.get<T>(endpoint, params);
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.post<T>(endpoint, body);
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.put<T>(endpoint, body);
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.patch<T>(endpoint, body);
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.delete<T>(endpoint, body);
  } catch (error: unknown) {
    handleApiError(error);
    throw error;
  }
}

export default {
  apiRequest,
  get,
  post,
  put,
  patch,
  del,
  ApiError,
  handleApiError,
};
