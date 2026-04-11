/**
 * Bill of materials lines for manufactured stock items (Skaftin table stock_item_bom_lines).
 */

import { skaftinClient } from '../backend';
import type { StockItemBomLine, StockItemBomLineInput } from '../types/item';

const TABLE_NAME = 'stock_item_bom_lines';

export class StockItemBomService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<StockItemBomLine[]> {
    const response = await skaftinClient.post<
      { rows: StockItemBomLine[]; rowCount: number } | StockItemBomLine[]
    >(`/app-api/database/tables/${TABLE_NAME}/select`, {
      limit: params?.limit ?? 10000,
      offset: params?.offset ?? 0,
      ...(params?.where && { where: params.where }),
    });
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.rows || [];
  }

  static async findByParentId(parentItemId: number): Promise<StockItemBomLine[]> {
    const rows = await this.findAll({
      where: { parent_item_id: parentItemId },
      limit: 500,
    });
    return rows;
  }

  static async deleteByParentId(parentItemId: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete<{ rowCount: number }>(
      `/app-api/database/tables/${TABLE_NAME}/delete`,
      { where: { parent_item_id: parentItemId } },
    );
    return response.data;
  }

  static async insertLine(data: StockItemBomLineInput): Promise<StockItemBomLine> {
    const response = await skaftinClient.post<StockItemBomLine>(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data },
    );
    return response.data;
  }

  /** Deletes all BOM rows for the parent, then inserts the given lines. */
  static async replaceForParent(
    parentItemId: number,
    lines: Array<{ component_item_id: number; quantity_per: number }>,
  ): Promise<void> {
    await this.deleteByParentId(parentItemId);
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
