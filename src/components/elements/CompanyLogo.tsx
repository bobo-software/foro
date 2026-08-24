import { useEffect, useState } from 'react';
import StorageService from '@/services/storageService';

const SIZE_CLASS = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
} as const;

interface CompanyLogoProps {
  /** Storage object path (`companies.logo_url`), not a presigned URL */
  path?: string | null;
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}

/**
 * Resolves `companies.logo_url` to a presigned download URL and renders it.
 * Falls back to the company name initial when the path is missing or fetch fails.
 */
export function CompanyLogo({ path, name, size = 'sm', className = '' }: CompanyLogoProps) {
  const [url, setUrl] = useState<string | null>(null);
  const box = SIZE_CLASS[size];

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    StorageService.getFileDownloadUrl(path)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const frame = `${box} shrink-0 rounded-md object-contain ${className}`;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${frame} bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600`}
      />
    );
  }

  return (
    <span
      className={`${frame} inline-flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-600`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
