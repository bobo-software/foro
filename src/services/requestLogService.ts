/**
 * Request Log Service
 * Superadmin-only: lists API request logs (foro-api's api_request_logs table).
 */

import { foroApiClient } from '../backend';

const BASE = '/api/v1/superadmin/request-logs';

export interface RequestLogRow {
  id: number;
  createdAt: string;
  method: string;
  url: string;
  durationMs: number;
  statusCode: number;
  companyId: number | null;
  userId: number | null;
  userEmail: string | null;
}

export interface RequestLogFilters {
  method?: string;
  statusCode?: number;
  companyId?: number;
  userId?: number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface RequestLogListResponse {
  rows: RequestLogRow[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Full detail for one request, including redacted/truncated request and
 * response bodies (JSON strings, or null when there was no body). See
 * foro-api's src/utils/redactSensitiveData.ts for what gets masked.
 */
export interface RequestLogDetail extends RequestLogRow {
  ipAddress: string | null;
  userAgent: string | null;
  requestBody: string | null;
  responseBody: string | null;
}

export const requestLogService = {
  async list(filters: RequestLogFilters = {}): Promise<RequestLogListResponse> {
    const response = await foroApiClient.get<RequestLogListResponse>(BASE, { ...filters });
    return response.data;
  },

  async get(id: number): Promise<RequestLogDetail> {
    const response = await foroApiClient.get<RequestLogDetail>(`${BASE}/${id}`);
    return response.data;
  },
};
