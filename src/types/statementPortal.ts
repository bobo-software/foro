/**
 * Client statement portal types — the public, OTP-gated flow for a company's
 * primary contact to view their statement/invoices. See foro-api's
 * `docs/api.md` "Client statement portal" section.
 */

export interface StatementPortalCompany {
  id: number;
  name: string;
  businessId: number | null;
}

export interface StatementRow {
  date: string;
  type: 'invoice' | 'payment' | 'credit_note';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
  invoiceId?: number;
}
