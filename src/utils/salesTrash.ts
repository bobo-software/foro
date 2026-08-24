/** Calendar months a trashed invoice/quotation is kept before the API purge cron hard-deletes it. */
export const SOFT_DELETE_RETENTION_MONTHS = 3;

export function isTrashed(deletedAt?: string | null): boolean {
  return Boolean(deletedAt);
}

export function trashPurgeDate(deletedAt: string): Date {
  const raw = String(deletedAt).trim();
  const iso = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)
    ? raw
    : `${raw.includes('T') ? raw : raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + SOFT_DELETE_RETENTION_MONTHS);
  return d;
}

export function formatTrashPurgeDate(deletedAt: string): string {
  return trashPurgeDate(deletedAt).toLocaleDateString();
}
