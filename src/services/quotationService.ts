/**
 * Quotation Service
 * Handles quotation CRUD; line items are in quotation_lines (QuotationLineService)
 */

import { skaftinClient } from '../backend';
import type { Quotation, CreateQuotationDto } from '../types/quotation';
import InvoiceService from './invoiceService';
import { computeNextDocumentNumber } from '../utils/documentNumber';

const TABLE_NAME = 'quotations';

function normalizeRows(response: unknown): Record<string, unknown>[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as Record<string, unknown>[];
  if (Array.isArray(r?.rows)) return r.rows as Record<string, unknown>[];
  if (Array.isArray(r)) return r as Record<string, unknown>[];
  return [];
}

function extractRowCount(response: unknown): number {
  const r = response as Record<string, unknown>;
  if (typeof r?.rowCount === 'number') return r.rowCount;
  const data = r?.data;
  if (typeof data === 'object' && data !== null) {
    const rc = (data as Record<string, unknown>).rowCount;
    if (typeof rc === 'number') return rc;
  }
  return 0;
}

function normalizeQuotation(raw: Record<string, unknown>): Quotation {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: raw.business_id != null ? Number(raw.business_id) : undefined,
    company_id: raw.company_id != null ? Number(raw.company_id) : null,
    project_id: raw.project_id != null ? Number(raw.project_id) : null,
    quotation_number: String(raw.quotation_number ?? ''),
    customer_name: String(raw.customer_name ?? ''),
    customer_email: raw.customer_email != null ? String(raw.customer_email) : undefined,
    customer_address: raw.customer_address != null ? String(raw.customer_address) : undefined,
    customer_vat_number: raw.customer_vat_number != null ? String(raw.customer_vat_number) : undefined,
    delivery_address: raw.delivery_address != null ? String(raw.delivery_address) : undefined,
    delivery_conditions: raw.delivery_conditions != null ? String(raw.delivery_conditions) : undefined,
    order_number: raw.order_number != null ? String(raw.order_number) : undefined,
    terms: raw.terms != null ? String(raw.terms) : undefined,
    issue_date: String(raw.issue_date ?? ''),
    valid_until: raw.valid_until != null ? String(raw.valid_until) : undefined,
    status: (raw.status as Quotation['status']) ?? 'draft',
    subtotal: Number(raw.subtotal) || 0,
    discount_percent: raw.discount_percent != null ? Number(raw.discount_percent) : undefined,
    tax_rate: raw.tax_rate != null ? Number(raw.tax_rate) : undefined,
    tax_amount: raw.tax_amount != null ? Number(raw.tax_amount) : undefined,
    total: Number(raw.total) || 0,
    currency: raw.currency != null ? String(raw.currency) : undefined,
    notes: raw.notes != null ? String(raw.notes) : undefined,
    converted_invoice_id: raw.converted_invoice_id != null ? Number(raw.converted_invoice_id) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

export class QuotationService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Quotation[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 5000,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    return normalizeRows(response).map(normalizeQuotation);
  }

  static async findById(id: number): Promise<Quotation | null> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        where: { id },
        limit: 1,
        offset: 0,
      }
    );
    const rows = normalizeRows(response);
    return rows[0] ? normalizeQuotation(rows[0]) : null;
  }

  static async create(data: CreateQuotationDto): Promise<Quotation> {
    const { items: _items, ...row } = data;
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data: row }
    );
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeQuotation(inserted as Record<string, unknown>);
  }

  static async update(id: number, data: Partial<CreateQuotationDto>): Promise<{ rowCount: number }> {
    const { items: _items, ...row } = data;
    const response = await skaftinClient.put(
      `/app-api/database/tables/${TABLE_NAME}/update`,
      { where: { id }, data: row as Record<string, unknown> }
    );
    return { rowCount: extractRowCount(response) };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(
      `/app-api/database/tables/${TABLE_NAME}/delete`,
      { where: { id } }
    );
    return { rowCount: extractRowCount(response) };
  }

  static async count(where?: Record<string, unknown>): Promise<number> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { ...(where && { where }), limit: 1, offset: 0 }
    );
    const rc = extractRowCount(response);
    if (rc > 0) return rc;
    return normalizeRows(response).length;
  }

  /**
   * If converted_invoice_id points at a missing invoice, clear the link and set status to accepted
   * so the quote can be edited or converted again.
   */
  static async repairStaleConversionLink(quotationId: number, quo: Quotation): Promise<Quotation> {
    if (quo.converted_invoice_id == null) return quo;
    const inv = await InvoiceService.findById(quo.converted_invoice_id);
    if (inv != null) return quo;
    await this.update(quotationId, { status: 'accepted', converted_invoice_id: null });
    return { ...quo, status: 'accepted', converted_invoice_id: undefined };
  }

  /**
   * When an invoice created from a quotation is deleted, clear the link and allow converting again.
   */
  static async clearConversionForDeletedInvoice(invoiceId: number): Promise<void> {
    const linked = await this.findAll({
      where: { converted_invoice_id: invoiceId },
      limit: 20,
      offset: 0,
    });
    for (const q of linked) {
      if (q.id == null) continue;
      await this.update(q.id, {
        status: 'accepted',
        converted_invoice_id: null,
      });
    }
  }

  static async getNextNumber(): Promise<string> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { limit: 5000, offset: 0 }
    );
    const rows = normalizeRows(response);
    return computeNextDocumentNumber(rows.map((r) => String(r.quotation_number ?? '')));
  }
}

export default QuotationService;
