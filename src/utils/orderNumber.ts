/**
 * Derives a company abbreviation for PO/order numbers: lowercase, strip
 * non-alphanumeric characters, keep the first 5 characters.
 */
export function deriveCompanyAbbreviation(name: string): string {
  const abbrev = (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return abbrev || 'co';
}

export type OrderNumberDocumentType = 'IN' | 'QU' | 'CN';

export interface ComputeOrderNumberParams {
  type: OrderNumberDocumentType;
  companyName: string;
  /** YYYY-MM-DD */
  issueDate: string;
  existingOrderNumbers: string[];
}

/**
 * Computes a PO/order number in the form `{TYPE}-{company5}-{YYYYMMDD}`,
 * appending a `-N` suffix only when another document for the same
 * company/type/day already used the base string.
 */
export function computeOrderNumber({
  type,
  companyName,
  issueDate,
  existingOrderNumbers,
}: ComputeOrderNumberParams): string {
  const base = `${type}-${deriveCompanyAbbreviation(companyName)}-${issueDate.replace(/-/g, '')}`;
  const pattern = new RegExp(`^${base}(?:-(\\d+))?$`);

  let maxSlot = 0;
  for (const num of existingOrderNumbers) {
    const match = pattern.exec(String(num ?? ''));
    if (!match) continue;
    const slot = match[1] ? parseInt(match[1], 10) : 1;
    if (slot > maxSlot) maxSlot = slot;
  }

  if (maxSlot === 0) return base;
  return `${base}-${maxSlot + 1}`;
}
