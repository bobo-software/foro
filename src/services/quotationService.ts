/**
 * Quotation Service
 * Handles quotation CRUD; line items are in quotation_lines (QuotationLineService)
 */

import { skaftinClient } from '../backend';
import type { Quotation, CreateQuotationDto } from '../types/quotation';
import InvoiceService from './invoiceService';

const TABLE_NAME = 'quotations';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeQuotation(raw: Record<string, unknown>): Quotation {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    subtotal: Number(raw.subtotal) || 0,
    tax_rate: raw.tax_rate != null ? Number(raw.tax_rate) : undefined,
    tax_amount: raw.tax_amount != null ? Number(raw.tax_amount) : undefined,
    total: Number(raw.total) || 0,
  } as Quotation;
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
    const rows = normalizeRows<Quotation>(response);
    return rows.map((q) => normalizeQuotation(q as unknown as Record<string, unknown>));
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
    const rows = normalizeRows<Quotation>(response);
    const q = rows[0] ?? null;
    return q ? normalizeQuotation(q as unknown as Record<string, unknown>) : null;
  }

  static async create(data: CreateQuotationDto): Promise<Quotation> {
    const { items: _items, ...row } = data;
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data: row }
    );
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeQuotation(inserted as unknown as Record<string, unknown>);
  }

  static async update(id: number, data: Partial<CreateQuotationDto>): Promise<{ rowCount: number }> {
    const { items: _items, ...row } = data;
    const response = await skaftinClient.put(
      `/app-api/database/tables/${TABLE_NAME}/update`,
      { where: { id }, data: row as Record<string, unknown> }
    );
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(
      `/app-api/database/tables/${TABLE_NAME}/delete`,
      { where: { id } }
    );
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async count(where?: Record<string, unknown>): Promise<number> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { ...(where && { where }), limit: 1, offset: 0 }
    );
    const rr = response as unknown as Record<string, unknown>;
    if (typeof rr?.rowCount === 'number') return rr.rowCount;
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
    const rows = normalizeRows<Quotation>(response);
    let max = 0;
    for (const row of rows) {
      const match = String(row.quotation_number ?? '').match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > max) max = n;
      }
    }
    return String(max + 1).padStart(4, '0');
  }
}

export default QuotationService;
