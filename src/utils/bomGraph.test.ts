import { describe, it, expect } from 'vitest';
import { wouldIntroduceBomCycle } from './bomGraph';

describe('wouldIntroduceBomCycle', () => {
  it('returns false for simple chain with no cycle', () => {
    const existing = [{ parent_item_id: 2, component_item_id: 3 }];
    expect(wouldIntroduceBomCycle(1, [2], existing)).toBe(false);
  });

  it('detects self-reference', () => {
    expect(wouldIntroduceBomCycle(1, [1], [])).toBe(true);
  });

  it('detects indirect cycle', () => {
    // 2 → 3, adding 1 → 2 while 3 → 1 exists
    const existing = [
      { parent_item_id: 2, component_item_id: 3 },
      { parent_item_id: 3, component_item_id: 1 },
    ];
    expect(wouldIntroduceBomCycle(1, [2], existing)).toBe(true);
  });

  it('ignores lines being replaced for the same parent', () => {
    const existing = [{ parent_item_id: 1, component_item_id: 99 }];
    // Replacing 1’s BOM with [2]; old 1→99 should not confuse the graph
    expect(wouldIntroduceBomCycle(1, [2], existing)).toBe(false);
  });

  it('returns false when manufactured item has no downstream path back to parent', () => {
    const existing = [
      { parent_item_id: 2, component_item_id: 3 },
      { parent_item_id: 3, component_item_id: 4 },
    ];
    expect(wouldIntroduceBomCycle(1, [2], existing)).toBe(false);
  });
});
