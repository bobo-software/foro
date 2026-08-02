/**
 * Invoice line items – stored in invoice_items table (not on invoices)
 */

import { foroApiClient } from '../backend';
import type { InvoiceItem } from '../types/invoice';

const BASE = '/api/v1/invoice-items';

interface ApiInvoiceItemRow {
  id: number;
  invoiceId: number;
  itemId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  sku: string | null;
  unitType: string;
  discountPercent: string | null;
}

function fromApi(row: ApiInvoiceItemRow): InvoiceItem {
  return {
    id: row.id,
    invoice_id: row.invoiceId,
    item_id: row.itemId ?? undefined,
    sku: row.sku ?? undefined,
    description: row.description,
    quantity: row.quantity,
    unit_price: Number(row.unitPrice),
    unit_type: row.unitType as InvoiceItem['unit_type'],
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    total: Number(row.total),
  };
}

export class InvoiceItemService {
  static async findByInvoiceId(invoiceId: number): Promise<InvoiceItem[]> {
    const response = await foroApiClient.get<ApiInvoiceItemRow[]>(BASE, { invoiceId, limit: 500 });
    return (response.data ?? []).map(fromApi);
  }

  static async insertMany(
    invoiceId: number,
    items: (Omit<InvoiceItem, 'id' | 'invoice_id'> & { item_id?: number })[]
  ): Promise<void> {
    for (const item of items) {
      const body: Record<string, unknown> = {
        invoiceId,
        ...(item.item_id != null && { itemId: item.item_id }),
        ...(item.sku != null && { sku: item.sku }),
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        unitType: item.unit_type ?? 'qty',
        discountPercent: Number(item.discount_percent) || 0,
        total: Number(item.total),
      };
      await foroApiClient.post(BASE, body);
    }
  }

  static async deleteByInvoiceId(invoiceId: number): Promise<void> {
    const items = await this.findByInvoiceId(invoiceId);
    await Promise.all(items.map((item) => (item.id ? foroApiClient.delete(`${BASE}/${item.id}`) : Promise.resolve())));
  }
}

export default InvoiceItemService;
