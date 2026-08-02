import { describe, it, expect } from 'vitest';
import {
  computeStockAvailability,
  computeBaselineQuantities,
  hasInsufficientStock,
  formatInsufficientStockMessage,
} from './stockAvailability';

describe('computeStockAvailability', () => {
  it('ignores free-text lines (no itemId)', () => {
    const result = computeStockAvailability(
      [{ itemId: undefined, quantity: 100 }],
      [{ id: 1, name: 'Widget', quantity: 5 }],
    );
    expect(result.size).toBe(0);
  });

  it('flags a single line exceeding stock', () => {
    const result = computeStockAvailability(
      [{ itemId: 1, quantity: 10 }],
      [{ id: 1, name: 'Widget', quantity: 5 }],
    );
    expect(result.get(1)).toMatchObject({ requested: 10, available: 5, shortBy: 5, short: true });
  });

  it('does not flag a line within stock', () => {
    const result = computeStockAvailability(
      [{ itemId: 1, quantity: 3 }],
      [{ id: 1, name: 'Widget', quantity: 5 }],
    );
    expect(result.get(1)).toMatchObject({ requested: 3, available: 5, shortBy: 0, short: false });
  });

  it('aggregates multiple rows referencing the same item', () => {
    const result = computeStockAvailability(
      [
        { itemId: 1, quantity: 3 },
        { itemId: 1, quantity: 4 },
      ],
      [{ id: 1, name: 'Widget', quantity: 5 }],
    );
    // 3 + 4 = 7 requested against 5 available — both rows contribute to one flagged entry
    expect(result.get(1)).toMatchObject({ requested: 7, available: 5, shortBy: 2, short: true });
  });

  it('applies a baseline (e.g. quantities already committed by the invoice being edited)', () => {
    const result = computeStockAvailability(
      [{ itemId: 1, quantity: 8 }],
      [{ id: 1, name: 'Widget', quantity: 5 }],
      { 1: 5 },
    );
    // 5 live + 5 baseline = 10 effective available, 8 requested -> fine
    expect(result.get(1)).toMatchObject({ requested: 8, available: 10, shortBy: 0, short: false });
  });

  it('falls back to a placeholder name when the item is missing from the stock list', () => {
    const result = computeStockAvailability([{ itemId: 42, quantity: 1 }], []);
    expect(result.get(42)?.name).toBe('#42');
  });
});

describe('computeBaselineQuantities', () => {
  it('sums quantities per itemId, ignoring free-text rows', () => {
    const baseline = computeBaselineQuantities([
      { itemId: 1, quantity: 2 },
      { itemId: 1, quantity: 3 },
      { itemId: undefined, quantity: 100 },
      { itemId: 2, quantity: 1 },
    ]);
    expect(baseline).toEqual({ 1: 5, 2: 1 });
  });
});

describe('hasInsufficientStock / formatInsufficientStockMessage', () => {
  it('reports and formats only the short entries', () => {
    const availability = computeStockAvailability(
      [
        { itemId: 1, quantity: 10 },
        { itemId: 2, quantity: 1 },
      ],
      [
        { id: 1, name: 'Widget', quantity: 5 },
        { id: 2, name: 'Gadget', quantity: 5 },
      ],
    );
    expect(hasInsufficientStock(availability)).toBe(true);
    const message = formatInsufficientStockMessage(availability);
    expect(message).toContain('Widget (need 10, have 5)');
    expect(message).not.toContain('Gadget');
  });

  it('reports false when nothing is short', () => {
    const availability = computeStockAvailability(
      [{ itemId: 1, quantity: 1 }],
      [{ id: 1, name: 'Widget', quantity: 5 }],
    );
    expect(hasInsufficientStock(availability)).toBe(false);
  });
});
