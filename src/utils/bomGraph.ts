/**
 * Bill-of-materials dependency graph: detect cycles when parent depends on components
 * (directed edges: parent → component).
 */

export interface BomEdge {
  parent_item_id: number;
  component_item_id: number;
}

/**
 * Returns true if adding/replacing BOM lines for `parentId` with the given components
 * would create a cycle (including self-reference).
 */
export function wouldIntroduceBomCycle(
  parentId: number,
  componentIds: number[],
  existingLines: BomEdge[],
): boolean {
  const unique = [...new Set(componentIds)];
  if (unique.some((c) => c === parentId)) return true;

  const fwd = new Map<number, number[]>();
  for (const row of existingLines) {
    if (row.parent_item_id === parentId) continue;
    const list = fwd.get(row.parent_item_id);
    if (list) list.push(row.component_item_id);
    else fwd.set(row.parent_item_id, [row.component_item_id]);
  }
  fwd.set(parentId, unique);

  function reaches(start: number, target: number): boolean {
    const visited = new Set<number>();
    const stack: number[] = [start];
    while (stack.length) {
      const node = stack.pop()!;
      if (node === target) return true;
      if (visited.has(node)) continue;
      visited.add(node);
      const next = fwd.get(node);
      if (next) for (const n of next) stack.push(n);
    }
    return false;
  }

  for (const c of unique) {
    if (reaches(c, parentId)) return true;
  }
  return false;
}
