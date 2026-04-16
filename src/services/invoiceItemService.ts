/**
 * Invoice line items – stored in invoice_items table (not on invoices)
 */

import { skaftinClient } from '../backend';
import type { InvoiceItem } from '../types/invoice';

const TABLE_NAME = 'invoice_items';

export interface CreateInvoiceItemRow {
  invoice_id: number;
  item_id?: number;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit_type?: string;
  discount_percent?: number;
  total: number;
}

export class InvoiceItemService {
  private static isNoRowsDeletedError(error: unknown): boolean {
    const maybe = error as { status?: number; data?: { message?: string; error?: string }; message?: string };
    if (maybe?.status !== 404) return false;
    const message = maybe?.data?.message ?? maybe?.data?.error ?? maybe?.message ?? '';
    return /no rows were deleted/i.test(message);
  }

  static async findByInvoiceId(invoiceId: number): Promise<InvoiceItem[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        where: { invoice_id: invoiceId },
        limit: 500,
        offset: 0,
      }
    );
    const r = response as unknown as Record<string, unknown>;
    if (Array.isArray(r?.data)) return r.data as InvoiceItem[];
    if (Array.isArray(r?.rows)) return r.rows as InvoiceItem[];
    if (Array.isArray(r)) return r as InvoiceItem[];
    return [];
  }

  static async insertMany(
    invoiceId: number,
    items: (Omit<InvoiceItem, 'id' | 'invoice_id'> & { item_id?: number })[]
  ): Promise<void> {
    for (const item of items) {
      const row: CreateInvoiceItemRow = {
        invoice_id: invoiceId,
        ...(item.item_id != null && { item_id: item.item_id }),
        ...(item.sku != null && { sku: item.sku }),
        description: item.description,
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        unit_type: item.unit_type ?? 'qty',
        discount_percent: Number(item.discount_percent) || 0,
        total: Number(item.total),
      };
      await skaftinClient.post(
        `/app-api/database/tables/${TABLE_NAME}/insert`,
        { data: row }
      );
    }
  }

  static async deleteByInvoiceId(invoiceId: number): Promise<void> {
    try {
      await skaftinClient.delete<{ rowCount?: number }>(
        `/app-api/database/tables/${TABLE_NAME}/delete`,
        { where: { invoice_id: invoiceId } }
      );
    } catch (error) {
      // Skaftin returns 404 when no rows match delete filter.
      if (this.isNoRowsDeletedError(error)) return;
      throw error;
    }
  }
}

export default InvoiceItemService;
