/**
 * Request Utilities
 * Backward compatibility wrapper for HTTP requests
 * Delegates to SkaftinClient
 */

import { skaftinClient, ApiResponse } from '../client/SkaftinClient';

export class ApiError extends Error {
  status?: number;
  data?: any;

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: any): never {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error.status) {
    throw new ApiError(
      error.message || `Request failed with status ${error.status}`,
      error.status,
      error.data
    );
  }

  throw new ApiError(error.message || 'An unexpected error occurred');
}

/**
 * Generic API request wrapper
 */
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResponse<T>> {
  try {
    const { method = 'GET', body } = options;
    
    switch (method.toUpperCase()) {
      case 'GET':
        return await skaftinClient.get<T>(endpoint, body);
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
          body: options.body,
          headers: options.headers as HeadersInit,
        });
    }
  } catch (error: any) {
    handleApiError(error);
    throw error; // This won't be reached but satisfies TypeScript
  }
}

/**
 * GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.get<T>(endpoint, params);
  } catch (error: any) {
    handleApiError(error);
    throw error;
  }
}

/**
 * POST request
 */
export async function post<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.post<T>(endpoint, body);
  } catch (error: any) {
    handleApiError(error);
    throw error;
  }
}

/**
 * PUT request
 */
export async function put<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.put<T>(endpoint, body);
  } catch (error: any) {
    handleApiError(error);
    throw error;
  }
}

/**
 * PATCH request
 */
export async function patch<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.patch<T>(endpoint, body);
  } catch (error: any) {
    handleApiError(error);
    throw error;
  }
}

/**
 * DELETE request
 */
export async function del<T>(
  endpoint: string,
  body?: any
): Promise<ApiResponse<T>> {
  try {
    return await skaftinClient.delete<T>(endpoint, body);
  } catch (error: any) {
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

