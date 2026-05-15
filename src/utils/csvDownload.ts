/** Escape one CSV field (RFC 4180-style quoting). */
export function escapeCsvField(value: unknown): string {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV text with header row + one line per data row (CRLF lines). */
export function buildCsvLines(headers: string[], rows: unknown[][]): string {
  const line = (cells: unknown[]) => cells.map(escapeCsvField).join(',');
  return [line(headers), ...rows.map((r) => line(r))].join('\r\n');
}

/** UTF-8 BOM so Excel recognizes UTF-8. */
export function withUtf8Bom(csv: string): string {
  return `\uFEFF${csv}`;
}

/** Trigger a browser download of a CSV file (client-side only). */
export function downloadCsvFile(filename: string, csvBody: string): void {
  const blob = new Blob([withUtf8Bom(csvBody)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
