/**
 * Invoice Types
 */

export type InvoiceDocumentKind = 'invoice' | 'credit_note';

export interface Invoice {
  id?: number;
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  /** Defaults to `invoice` when absent (legacy rows). */
  document_kind?: InvoiceDocumentKind;
  /** Source invoice when this row is a credit note. */
  credited_invoice_id?: number | null;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_vat_number?: string;
  delivery_address?: string;
  delivery_conditions?: 'collect' | 'deliver' | string;
  order_number?: string;
  terms?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_percent?: number;
  total: number;
  currency?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type InvoiceStatus = 'draft' | 'accepted' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  item_id?: number;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_type?: 'qty' | 'hrs' | string;
  discount_percent?: number;
  total: number;
}

export interface CreateInvoiceDto {
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  document_kind?: InvoiceDocumentKind;
  credited_invoice_id?: number | null;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_vat_number?: string;
  delivery_address?: string;
  delivery_conditions?: string;
  order_number?: string;
  terms?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  discount_percent?: number;
  total: number;
  currency?: string;
  notes?: string;
  items?: Omit<InvoiceItem, 'id' | 'invoice_id'>[];
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  id: number;
}
