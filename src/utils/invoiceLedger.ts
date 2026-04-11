import type { Invoice, InvoiceDocumentKind } from '../types/invoice';

export function normalizeDocumentKind(kind: unknown): InvoiceDocumentKind {
  return kind === 'credit_note' ? 'credit_note' : 'invoice';
}

export function isCreditNoteInvoice(invoice: Pick<Invoice, 'document_kind'>): boolean {
  return normalizeDocumentKind(invoice.document_kind) === 'credit_note';
}

/** Effect on accounts receivable: positive increases balance owed, negative reduces it. */
export function getInvoiceLedgerAmount(invoice: Pick<Invoice, 'document_kind' | 'total'>): number {
  const t = Number(invoice.total) || 0;
  return isCreditNoteInvoice(invoice) ? -t : t;
}

/** Tailwind classes for `<tr>` rows so credit notes read differently from invoices */
export function invoiceTableRowClassName(invoice: Pick<Invoice, 'document_kind'>): string {
  return isCreditNoteInvoice(invoice)
    ? 'bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100/90 dark:hover:bg-violet-900/50'
    : 'hover:bg-slate-50/60 dark:hover:bg-slate-700/40';
}
