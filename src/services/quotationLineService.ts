/**
 * Quotation line items – stored in quotation_lines table
 */

import { foroApiClient } from '../backend';
import type { QuotationLine } from '../types/quotation';

const BASE = '/api/v1/quotation-lines';

interface ApiQuotationLineRow {
  id: number;
  quotationId: number;
  itemId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  sku: string | null;
  discountPercent: string | null;
  unitType: string;
}

function fromApi(row: ApiQuotationLineRow): QuotationLine {
  return {
    id: row.id,
    quotation_id: row.quotationId,
    item_id: row.itemId ?? undefined,
    sku: row.sku ?? undefined,
    description: row.description,
    quantity: row.quantity,
    unit_price: Number(row.unitPrice),
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    total: Number(row.total),
    unit_type: row.unitType as QuotationLine['unit_type'],
  };
}

export class QuotationLineService {
  static async findByQuotationId(quotationId: number): Promise<QuotationLine[]> {
    const response = await foroApiClient.get<ApiQuotationLineRow[]>(BASE, { quotationId, limit: 500 });
    return (response.data ?? []).map(fromApi);
  }

  static async insertMany(
    quotationId: number,
    items: (Omit<QuotationLine, 'id' | 'quotation_id'> & { item_id?: number })[]
  ): Promise<void> {
    for (const item of items) {
      await foroApiClient.post(BASE, {
        quotationId,
        ...(item.item_id != null && { itemId: item.item_id }),
        ...(item.sku != null && item.sku !== '' && { sku: item.sku }),
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        discountPercent: Number(item.discount_percent ?? 0),
        total: Number(item.total),
        unitType: item.unit_type ?? 'qty',
      });
    }
  }

  static async deleteByQuotationId(quotationId: number): Promise<void> {
    const lines = await this.findByQuotationId(quotationId);
    await Promise.all(lines.map((line) => (line.id ? foroApiClient.delete(`${BASE}/${line.id}`) : Promise.resolve())));
  }
}

export default QuotationLineService;
