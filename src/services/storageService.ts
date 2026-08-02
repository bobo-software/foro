/**
 * Storage Service
 * Handles file uploads and downloads via foro-api's S3-backed storage endpoints.
 *
 * Bucket is server-configured (`S3_BUCKET` env var on foro-api) — the client no
 * longer chooses/sends a bucket name (Skaftin required one; foro-api owns it).
 */

import { foroApiClient } from '../backend';

export class StorageService {
  /**
   * Upload a file using multipart form data.
   * Endpoint: POST /api/v1/storage/files (fields: file, path)
   */
  static async upload(
    filePath: string,
    file: File,
  ): Promise<{ fileName: string; size: number; etag: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', filePath);

    const response = await foroApiClient.postFormData<{
      fileName: string;
      size: number;
      etag: string;
      url: string;
    }>('/api/v1/storage/files', formData);
    return response.data;
  }

  /**
   * Upload a file using base64 encoding
   * Endpoint: POST /api/v1/storage/upload-base64
   */
  static async uploadBase64(
    fileName: string,
    fileContent: string,
    contentType?: string,
  ): Promise<{ fileName: string; size: number; etag: string; url: string }> {
    const response = await foroApiClient.post<{
      fileName: string;
      size: number;
      etag: string;
      url: string;
    }>('/api/v1/storage/upload-base64', {
      filePath: fileName,
      fileContent,
      ...(contentType && { contentType }),
    });
    return response.data;
  }

  /**
   * Get a fresh presigned download URL for a file.
   * Endpoint: GET /api/v1/storage/files/download?path=...
   */
  static async getFileDownloadUrl(filePath: string): Promise<string> {
    const response = await foroApiClient.get<{ url: string }>(
      `/api/v1/storage/files/download?path=${encodeURIComponent(filePath)}`
    );
    return response.data.url;
  }

  /**
   * Delete a file from storage
   * Endpoint: DELETE /api/v1/storage/files?path=...
   */
  static async delete(filePath: string): Promise<void> {
    await foroApiClient.delete(`/api/v1/storage/files?path=${encodeURIComponent(filePath)}`);
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
   * Fetch a file from a URL and return as an object URL for display.
   * `url` is expected to be a presigned S3 URL from `getFileDownloadUrl` —
   * presigned URLs are self-authenticating, so no auth headers are needed
   * (unlike the old Skaftin download endpoint, which required them).
   */
  static async fetchFileAsObjectUrl(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  /**
   * List files in the bucket
   * Endpoint: GET /api/v1/storage/files?prefix=&maxKeys=
   */
  static async listFiles(prefix?: string, maxKeys?: number): Promise<{
    files: Array<{ name: string; size: number; lastModified: string; etag: string }>;
    isTruncated: boolean;
  }> {
    const params: Record<string, unknown> = {};
    if (prefix) params.prefix = prefix;
    if (maxKeys) params.maxKeys = maxKeys;

    const response = await foroApiClient.get<{
      files: Array<{ name: string; size: number; lastModified: string; etag: string }>;
      isTruncated: boolean;
    }>('/api/v1/storage/files', params);
    return response.data;
  }
}

export default StorageService;
