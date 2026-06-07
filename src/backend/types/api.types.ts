/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data: T;
}

/**
 * API error response
 */
export interface ApiError {
  success: false;
  message: string;
  error: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Query result from raw SQL
 */
export interface QueryResult {
  rows: unknown[];
  rowCount: number;
  columns: string[];
  executionTime: number;
}

