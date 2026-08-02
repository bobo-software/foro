import type { LineRow } from '../components/documents/LineItemsEditor';
import type { Item } from '../types/item';

export interface StockAvailabilityEntry {
  itemId: number;
  name: string;
  /** Aggregated quantity across ALL rows referencing this itemId in the document. */
  requested: number;
  /** Live stock quantity, plus any baseline adjustment (see computeBaselineQuantities). */
  available: number;
  shortBy: number;
  short: boolean;
}

export type StockAvailabilityMap = Map<number, StockAvailabilityEntry>;

/**
 * Aggregates requested quantity per itemId across `rows` and compares against each
 * item's live quantity (optionally adjusted by `baselineByItemId`, additive). Every
 * row sharing an itemId contributes to the same entry, so two lines of the same item
 * that individually look fine still flag together if they collectively oversell.
 */
export function computeStockAvailability(
  rows: Pick<LineRow, 'itemId' | 'quantity'>[],
  stockItems: Pick<Item, 'id' | 'name' | 'quantity'>[],
  baselineByItemId?: Record<number, number>,
): StockAvailabilityMap {
  const requested = new Map<number, number>();
  for (const row of rows) {
    if (row.itemId == null) continue;
    requested.set(row.itemId, (requested.get(row.itemId) ?? 0) + row.quantity);
  }

  const result: StockAvailabilityMap = new Map();
  for (const [itemId, req] of requested) {
    const stockItem = stockItems.find((i) => i.id === itemId);
    const available = (stockItem?.quantity ?? 0) + (baselineByItemId?.[itemId] ?? 0);
    const shortBy = Math.max(0, req - available);
    result.set(itemId, {
      itemId,
      name: stockItem?.name ?? `#${itemId}`,
      requested: req,
      available,
      shortBy,
      short: shortBy > 0,
    });
  }
  return result;
}

/**
 * Snapshot itemId -> summed quantity from a set of rows, for use as a baseline.
 * Call once, right after an existing invoice loads, before any edits — saving will
 * restore these quantities before re-deducting the new ones, so they need to be
 * added back onto live stock when checking sufficiency during that edit.
 */
export function computeBaselineQuantities(rows: Pick<LineRow, 'itemId' | 'quantity'>[]): Record<number, number> {
  const baseline: Record<number, number> = {};
  for (const row of rows) {
    if (row.itemId == null) continue;
    baseline[row.itemId] = (baseline[row.itemId] ?? 0) + row.quantity;
  }
  return baseline;
}

export function hasInsufficientStock(availability: StockAvailabilityMap): boolean {
  return [...availability.values()].some((entry) => entry.short);
}

export function formatInsufficientStockMessage(availability: StockAvailabilityMap): string {
  const shorts = [...availability.values()].filter((entry) => entry.short);
  return `Not enough stock: ${shorts.map((entry) => `${entry.name} (need ${entry.requested}, have ${entry.available})`).join('; ')}`;
}
