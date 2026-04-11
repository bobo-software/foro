/**
 * Item / Stock types (products)
 */

export type StockItemType = 'single' | 'manufactured';

export interface Item {
  id?: number;
  business_id?: number;
  name: string;
  sku?: string;
  description?: string;
  /** Selling price per unit */
  unit_price: number;
  /** Cost price per unit (optional, for margin calculation) */
  cost_price?: number;
  quantity?: number;
  tax_rate?: number;
  /** Catalogue kind: plain SKU vs assembly with BOM */
  item_type?: StockItemType;
  created_at?: string;
  updated_at?: string;
}

export interface CreateItemDto {
  business_id?: number;
  name: string;
  sku?: string;
  description?: string;
  unit_price: number;
  cost_price?: number;
  quantity?: number;
  tax_rate?: number;
  item_type?: StockItemType;
}

/** One BOM row in Skaftin (manufactured parent → component). */
export interface StockItemBomLine {
  id?: number;
  parent_item_id: number;
  component_item_id: number;
  quantity_per: number;
  created_at?: string;
}

export type StockItemBomLineInput = Omit<StockItemBomLine, 'id' | 'created_at'>;

/** BOM line with joined component info for display. */
export interface StockItemBomLineWithComponent extends StockItemBomLine {
  component_name?: string;
  component_sku?: string;
}
