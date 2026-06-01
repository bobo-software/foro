/**
 * Storage Service
 * Handles file uploads and downloads via Skaftin MinIO buckets
 * 
 * API Reference: client-sdk/requests/04-STORAGE-REQUESTS.md
 */

import { skaftinClient } from '../backend';
import { SKAFTIN_CONFIG } from '../config/skaftin.config';
import { TokenManager } from './TokenManager';

/** MinIO bucket registered in Skaftin for this project (see list_project_buckets). */
const BUCKET_NAME = 'foroman';

export class StorageService {
  /**
   * Upload a file using multipart form data (Form with Bucket)
   * Endpoint: POST /app-api/storage/files
   * Form fields: file, bucket, path
   */
  static async upload(
    filePath: string,
    file: File,
  ): Promise<{ fileName: string; size: number; etag: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', BUCKET_NAME);
    formData.append('path', filePath);

    const response = await skaftinClient.postFormData<{
      fileName: string;
      size: number;
      etag: string;
      url: string;
    }>('/app-api/storage/files', formData);
    return response.data;
  }

  /**
   * Upload a file using base64 encoding
   * Endpoint: POST /app-api/storage/:bucketName/upload
   */
  static async uploadBase64(
    fileName: string,
    fileContent: string,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<{ fileName: string; size: number; etag: string; url: string }> {
    const response = await skaftinClient.post<{
      fileName: string;
      size: number;
      etag: string;
      url: string;
    }>(`/app-api/storage/${BUCKET_NAME}/upload`, {
      filePath: fileName,
      fileContent,
      ...(contentType && { contentType }),
      ...(metadata && { metadata }),
    });
    return response.data;
  }

  /**
   * Get a fresh presigned download URL for a file.
   * Endpoint: GET /app-api/storage/files/download?bucket=...&path=...&returnUrl=true
   */
  static async getFileDownloadUrl(filePath: string): Promise<string> {
    const response = await skaftinClient.get<{ url: string }>(
      `/app-api/storage/files/download?bucket=${encodeURIComponent(BUCKET_NAME)}&path=${encodeURIComponent(filePath)}&returnUrl=true`
    );
    return response.data.url;
  }

  /**
   * Delete a file from storage
   * Endpoint: DELETE /app-api/storage/:bucketName/files/:filePath
   */
  static async delete(filePath: string): Promise<void> {
    await skaftinClient.delete(`/app-api/storage/${BUCKET_NAME}/files/${encodeURIComponent(filePath)}`);
  }

  /**
   * Upload a company logo.
   * Stored as: {businessId}/company_logo.{extension}
   * Returns the file **path** (not URL) to be persisted in the DB.
   */
  static async uploadCompanyLogo(
    businessId: number,
    file: File,
  ): Promise<{ filePath: string; data: { fileName: string; size: number; etag: string; url: string } }> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `${businessId}/company_logo.${extension}`;
    const data = await this.upload(filePath, file);
    return { filePath, data };
  }

  /**
   * Delete company logo by its stored path
   */
  static async deleteCompanyLogo(filePath: string): Promise<void> {
    return this.delete(filePath);
  }

  /**
   * Upload a client company logo.
   * Stored as: companies/{companyId}/logo.{extension}
   * Returns the file **path** (not URL) to be persisted in the DB.
   */
  static async uploadClientCompanyLogo(
    companyId: number,
    file: File,
  ): Promise<{ filePath: string; data: { fileName: string; size: number; etag: string; url: string } }> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `companies/${companyId}/logo.${extension}`;
    const data = await this.upload(filePath, file);
    return { filePath, data };
  }

  /**
   * Fetch a file from a URL (with auth headers) and return as an object URL for display.
   * Useful for <img src> where the endpoint requires auth.
   */
  static async fetchFileAsObjectUrl(url: string): Promise<string | null> {
    try {
      const headers: Record<string, string> = {};
      
      // Add API key
      const apiKey = SKAFTIN_CONFIG.apiKey;
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }

      // Add JWT Bearer token if available
      const token = TokenManager.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers, credentials: 'include' });
      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  /**
   * List files in the bucket
   * Endpoint: GET /app-api/storage/:bucketName/files
   */
  static async listFiles(prefix?: string, maxKeys?: number): Promise<{
    files: Array<{ name: string; size: number; lastModified: string; etag: string }>;
    isTruncated: boolean;
  }> {
    const params = new URLSearchParams();
    if (prefix) params.set('prefix', prefix);
    if (maxKeys) params.set('maxKeys', String(maxKeys));
    const qs = params.toString();

    const response = await skaftinClient.get<{
      files: Array<{ name: string; size: number; lastModified: string; etag: string }>;
      isTruncated: boolean;
    }>(`/app-api/storage/${BUCKET_NAME}/files${qs ? `?${qs}` : ''}`);
    return response.data;
  }
}

export default StorageService;
