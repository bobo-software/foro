/**
 * Quotation types
 */

export interface Quotation {
  id?: number;
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  quotation_number: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_vat_number?: string;
  delivery_address?: string;
  delivery_conditions?: 'collect' | 'deliver' | string;
  order_number?: string;
  terms?: string;
  issue_date: string;
  valid_until?: string;
  status: QuotationStatus;
  subtotal: number;
  discount_percent?: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  notes?: string;
  converted_invoice_id?: number;
  created_at?: string;
  updated_at?: string;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted';

export type QuotationLineUnitType = 'qty' | 'hrs';

export interface QuotationLine {
  id?: number;
  quotation_id?: number;
  item_id?: number;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  total: number;
  unit_type?: QuotationLineUnitType;
}

export interface CreateQuotationDto {
  business_id?: number | null;
  company_id?: number | null;
  project_id?: number | null;
  quotation_number: string;
  customer_name: string;
  customer_email?: string;
  customer_address?: string;
  customer_vat_number?: string;
  delivery_address?: string;
  delivery_conditions?: string;
  order_number?: string;
  terms?: string;
  issue_date: string;
  valid_until?: string;
  status: QuotationStatus;
  subtotal: number;
  discount_percent?: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  notes?: string;
  /** Omit or set a number when creating; use `null` on update to clear the invoice link */
  converted_invoice_id?: number | null;
  items?: Omit<QuotationLine, 'id' | 'quotation_id'>[];
}
