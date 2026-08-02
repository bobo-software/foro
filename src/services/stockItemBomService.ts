/**
 * Bill of materials lines for manufactured stock items.
 */

import { foroApiClient } from '../backend';
import type { StockItemBomLine, StockItemBomLineInput } from '../types/item';

const BASE = '/api/v1/stock-item-bom-lines';

interface ApiBomLineRow {
  id: number;
  parentItemId: number;
  componentItemId: number;
  quantityPer: string;
  createdAt: string | null;
}

function fromApi(row: ApiBomLineRow): StockItemBomLine {
  return {
    id: row.id,
    parent_item_id: row.parentItemId,
    component_item_id: row.componentItemId,
    quantity_per: Number(row.quantityPer),
    created_at: row.createdAt ?? undefined,
  };
}

export class StockItemBomService {
  static async findAll(params?: { where?: Record<string, unknown>; limit?: number; offset?: number }): Promise<StockItemBomLine[]> {
    const parentItemId = (params?.where as Record<string, unknown> | undefined)?.parent_item_id;
    const response = await foroApiClient.get<ApiBomLineRow[]>(BASE, {
      limit: params?.limit ?? 10000,
      offset: params?.offset ?? 0,
      ...(parentItemId !== undefined && { parentItemId }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findByParentId(parentItemId: number): Promise<StockItemBomLine[]> {
    return this.findAll({ where: { parent_item_id: parentItemId }, limit: 500 });
  }

  static async deleteByParentId(parentItemId: number): Promise<{ rowCount: number }> {
    const existing = await this.findByParentId(parentItemId);
    if (existing.length === 0) {
      return { rowCount: 0 };
    }
    await Promise.all(existing.map((line) => (line.id ? foroApiClient.delete(`${BASE}/${line.id}`) : Promise.resolve())));
    return { rowCount: existing.length };
  }

  static async insertLine(data: StockItemBomLineInput): Promise<StockItemBomLine> {
    const response = await foroApiClient.post<ApiBomLineRow>(BASE, {
      parentItemId: data.parent_item_id,
      componentItemId: data.component_item_id,
      quantityPer: data.quantity_per,
    });
    return fromApi(response.data);
  }

  /**
   * Syncs BOM rows for a parent item.
   * Skips DELETE when there are no existing rows (many APIs error on delete with 0 matches).
   */
  static async replaceForParent(
    parentItemId: number,
    lines: Array<{ component_item_id: number; quantity_per: number }>,
  ): Promise<void> {
    const existing = await this.findByParentId(parentItemId);
    if (existing.length === 0 && lines.length === 0) return;

    if (existing.length > 0) {
      await Promise.all(existing.map((line) => (line.id ? foroApiClient.delete(`${BASE}/${line.id}`) : Promise.resolve())));
    }

    for (const line of lines) {
      await this.insertLine({
        parent_item_id: parentItemId,
        component_item_id: line.component_item_id,
        quantity_per: line.quantity_per,
      });
    }
  }
}

export default StockItemBomService;
