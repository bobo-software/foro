/**
 * Escape `%`, `_`, and `\` for use inside SQL `ILIKE` / `LIKE` patterns with default escape `\`.
 * @see docs/03-database/project-tasks-select-filters.md
 */
export function escapeIlikePattern(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
