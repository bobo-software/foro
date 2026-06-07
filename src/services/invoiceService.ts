/**
 * Invoice Service
 * Handles all invoice-related API calls
 */

import { skaftinClient } from '../backend';
import type { Invoice, CreateInvoiceDto } from '../types/invoice';
import { normalizeDocumentKind } from '../utils/invoiceLedger';

export class InvoiceService {
  private static readonly TABLE_NAME = 'invoices';

  /** Normalize select response: API may return { data: T[] } or { rows: T[] } */
  private static normalizeRows<T>(response: unknown): T[] {
    const r = response as Record<string, unknown>;
    if (Array.isArray(r?.data)) return r.data as T[];
    if (Array.isArray(r?.rows)) return r.rows as T[];
    if (Array.isArray(r)) return r as T[];
    return [];
  }

  private static extractRowCount(response: unknown): number | null {
    const r = response as Record<string, unknown>;
    if (typeof r?.rowCount === 'number') return r.rowCount;
    const data = r?.data;
    if (typeof data === 'object' && data !== null) {
      const rc = (data as Record<string, unknown>).rowCount;
      if (typeof rc === 'number') return rc;
    }
    return null;
  }

  /**
   * Get all invoices
   * POST /app-api/database/tables/invoices/select with limit & offset
   */
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Invoice[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${this.TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 5000,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    const rows = this.normalizeRows<Record<string, unknown>>(response);
    return rows.map((inv) => this.normalizeInvoice(inv));
  }

  /**
   * Get invoice by ID
   * POST /app-api/database/tables/invoices/select with limit & offset
   */
  static async findById(id: number): Promise<Invoice | null> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${this.TABLE_NAME}/select`,
      {
        where: { id },
        limit: 1,
        offset: 0,
      }
    );
    const rows = this.normalizeRows<Record<string, unknown>>(response);
    const inv = rows[0] ?? null;
    return inv ? this.normalizeInvoice(inv) : null;
  }

  /** Ensure numeric fields are numbers (API may return strings) */
  private static normalizeInvoice(raw: Record<string, unknown>): Invoice {
    const creditedRaw = raw.credited_invoice_id;
    let credited_invoice_id: number | null | undefined;
    if (creditedRaw === null) credited_invoice_id = null;
    else if (creditedRaw !== undefined && creditedRaw !== '')
      credited_invoice_id = Number(creditedRaw);
    return {
      id: raw.id != null ? Number(raw.id) : undefined,
      business_id: raw.business_id != null ? Number(raw.business_id) : undefined,
      company_id: raw.company_id != null ? Number(raw.company_id) : null,
      project_id: raw.project_id != null ? Number(raw.project_id) : null,
      document_kind: normalizeDocumentKind(raw.document_kind),
      credited_invoice_id,
      invoice_number: String(raw.invoice_number ?? ''),
      customer_name: String(raw.customer_name ?? ''),
      customer_email: raw.customer_email != null ? String(raw.customer_email) : undefined,
      customer_address: raw.customer_address != null ? String(raw.customer_address) : undefined,
      customer_vat_number: raw.customer_vat_number != null ? String(raw.customer_vat_number) : undefined,
      delivery_address: raw.delivery_address != null ? String(raw.delivery_address) : undefined,
      delivery_conditions: raw.delivery_conditions != null ? String(raw.delivery_conditions) : undefined,
      order_number: raw.order_number != null ? String(raw.order_number) : undefined,
      terms: raw.terms != null ? String(raw.terms) : undefined,
      issue_date: String(raw.issue_date ?? ''),
      due_date: String(raw.due_date ?? ''),
      status: (raw.status as Invoice['status']) ?? 'draft',
      subtotal: Number(raw.subtotal) || 0,
      tax_rate: raw.tax_rate != null ? Number(raw.tax_rate) : undefined,
      tax_amount: raw.tax_amount != null ? Number(raw.tax_amount) : undefined,
      discount_percent: raw.discount_percent != null ? Number(raw.discount_percent) : undefined,
      total: Number(raw.total) || 0,
      currency: raw.currency != null ? String(raw.currency) : undefined,
      notes: raw.notes != null ? String(raw.notes) : undefined,
      created_at: raw.created_at != null ? String(raw.created_at) : undefined,
      updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
    };
  }

  /**
   * Create a new invoice (line items go to invoice_items table via InvoiceItemService)
   */
  static async create(data: CreateInvoiceDto): Promise<Invoice> {
    const { items: _items, ...invoiceRow } = data;
    const response = await skaftinClient.post<unknown>(
      `/app-api/database/tables/${this.TABLE_NAME}/insert`,
      { data: invoiceRow }
    );
    const inner = response.data;
    const inserted = Array.isArray(inner)
      ? (inner[0] as Record<string, unknown> | undefined)
      : (inner as Record<string, unknown> | undefined);
    if (!inserted || typeof inserted !== 'object') {
      throw new Error('Invalid response from invoice create: missing inserted row');
    }
    return this.normalizeInvoice(inserted);
  }

  /**
   * Update an invoice (line items are managed separately via InvoiceItemService)
   */
  static async update(id: number, data: Partial<CreateInvoiceDto>): Promise<{ rowCount: number }> {
    const { items: _items, ...invoiceRow } = data;
    const response = await skaftinClient.put<{ rowCount: number }>(
      `/app-api/database/tables/${this.TABLE_NAME}/update`,
      {
        where: { id },
        data: invoiceRow,
      }
    );
    return response.data;
  }

  /**
   * Delete an invoice
   */
  static async delete(id: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete<{ rowCount: number }>(
      `/app-api/database/tables/${this.TABLE_NAME}/delete`,
      {
        where: { id },
      }
    );
    return response.data;
  }

  /**
   * Get invoices by status
   */
  static async findByStatus(status: string): Promise<Invoice[]> {
    return this.findAll({
      where: { status },
      orderBy: 'issue_date',
      orderDirection: 'DESC',
    });
  }

  /**
   * Count invoices
   * POST /app-api/database/tables/invoices/select with limit & offset
   */
  static async count(where?: Record<string, unknown>): Promise<number> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${this.TABLE_NAME}/select`,
      {
        ...(where && { where }),
        limit: 1,
        offset: 0,
      }
    );
    const rc = this.extractRowCount(response);
    if (rc !== null) return rc;
    return this.normalizeRows(response).length;
  }
}

export default InvoiceService;
