export function withIds<T extends { id?: number }>(items: T[]): (T & { id: number })[] {
  return items.filter((item): item is T & { id: number } => item.id != null);
}
