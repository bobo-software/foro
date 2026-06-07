/**
 * Logo helper for PDF generation.
 *
 * Fetches the company logo from MinIO via a presigned URL,
 * converts it to a base64 data URL, and caches the result
 * so repeated exports don't re-fetch.
 */

import { StorageService } from '../services/storageService';
import { SKAFTIN_CONFIG } from '../config/skaftin.config';
import { logger } from './logger';
import { TokenManager } from '../services/TokenManager';

export interface LogoData {
  /** Base64-encoded image data (without the data:... prefix) */
  base64: string;
  /** Image format for jsPDF addImage: 'PNG' | 'JPEG' | 'WEBP' */
  format: string;
  /** Original width in pixels (used for aspect ratio) */
  width: number;
  /** Original height in pixels */
  height: number;
}

/** In-memory cache keyed by logo file path */
const logoCache = new Map<string, LogoData>();

/**
 * Given a logo file path (as stored in `business.logo_url`),
 * fetch the image and return base64 data suitable for jsPDF.addImage().
 *
 * Returns null if the logo cannot be fetched or decoded.
 */
export async function fetchLogoAsBase64(logoFilePath: string): Promise<LogoData | null> {
  if (!logoFilePath) return null;

  // Return cached version if available
  const cached = logoCache.get(logoFilePath);
  if (cached) return cached;

  try {
    // Get presigned download URL
    const downloadUrl = await StorageService.getFileDownloadUrl(logoFilePath);

    // Fetch the image with auth headers
    const headers: Record<string, string> = {};
    const apiKey = SKAFTIN_CONFIG.apiKey;
    if (apiKey) headers['X-API-Key'] = apiKey;
    const token = TokenManager.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(downloadUrl, { headers, credentials: 'include' });
    if (!response.ok) return null;

    const blob = await response.blob();

    // Determine format from MIME type
    const mimeType = blob.type.toLowerCase();
    let format = 'PNG';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) format = 'JPEG';
    else if (mimeType.includes('webp')) format = 'WEBP';
    else if (mimeType.includes('png')) format = 'PNG';
    else if (mimeType.includes('svg')) {
      // SVG not directly supported by jsPDF.addImage — skip
      return null;
    }

    // Convert to base64
    const base64 = await blobToBase64(blob);
    if (!base64) return null;

    // Get image dimensions using an offscreen Image
    const dimensions = await getImageDimensions(base64, mimeType);

    const data: LogoData = {
      base64,
      format,
      width: dimensions.width,
      height: dimensions.height,
    };

    logoCache.set(logoFilePath, data);
    return data;
  } catch (err) {
    logger.warn('Failed to fetch logo for PDF:', err);
    return null;
  }
}

/** Clear the logo cache (e.g. after uploading a new logo) */
export function clearLogoCache(): void {
  logoCache.clear();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip the data:image/...;base64, prefix — jsPDF wants raw base64
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function getImageDimensions(base64: string, mimeType: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 100, height: 100 }); // fallback
    img.src = `data:${mimeType};base64,${base64}`;
  });
}
