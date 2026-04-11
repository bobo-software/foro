import type { ReactNode } from 'react';
import AppText from '@/components/text/AppText';

export interface AppDataTableColumn<T> {
  id: string;
  header: string;
  /** Cell alignment (header matches) */
  align?: 'left' | 'right' | 'center';
  /** Extra classes on `<th>` */
  headerClassName?: string;
  /** Extra classes on `<td>` */
  cellClassName?: string;
  render: (row: T) => ReactNode;
}

const borderRowClass = 'border-t border-slate-100 dark:border-slate-700/60';
const defaultRowHoverClass = 'hover:bg-slate-50/60 dark:hover:bg-slate-700/40';

export interface AppDataTableProps<T> {
  /** Shown in the card header (ignored when `embedded`) */
  title?: string;
  /** Optional icon before the title (e.g. LuUsers, LuTrendingUp); ignored when `embedded` */
  titleIcon?: ReactNode;
  columns: AppDataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string | number;
  /** Merged with default row border / hover; use for row highlights */
  getRowClassName?: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  /**
   * When true, only the scrollable table block is rendered (no outer card, no title row).
   * Use inside tab panels that already have a heading and wrapper card.
   */
  embedded?: boolean;
}

function alignClass(align: AppDataTableColumn<unknown>['align']): { th: string; td: string } {
  if (align === 'right') return { th: 'text-right', td: 'text-right' };
  if (align === 'center') return { th: 'text-center', td: 'text-center' };
  return { th: 'text-left', td: 'text-left' };
}

/**
 * Card-wrapped HTML table shared by dashboard-style lists (invoices, companies, etc.).
 */
export function AppDataTable<T>({
  title = '',
  titleIcon,
  columns,
  data,
  getRowKey,
  getRowClassName,
  onRowClick,
  loading = false,
  error = null,
  emptyMessage = 'Nothing to show.',
  embedded = false,
}: AppDataTableProps<T>) {
  const body = (
    <div className="overflow-x-auto">
      {error && (
        <div className="px-4 py-2 text-xs text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          {error}
        </div>
      )}
      {loading ? (
        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">Loading…</div>
      ) : data.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">{emptyMessage}</div>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium">
              {columns.map((col) => {
                const a = alignClass(col.align);
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={`px-4 py-2 ${a.th} ${col.headerClassName ?? ''}`.trim()}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const highlight = getRowClassName?.(row) ?? defaultRowHoverClass;
              const clickable = Boolean(onRowClick);
              return (
                <tr
                  key={getRowKey(row, index)}
                  className={`${borderRowClass} ${highlight} ${clickable ? 'cursor-pointer' : ''}`.trim()}
                  onClick={clickable ? () => onRowClick?.(row) : undefined}
                >
                  {columns.map((col) => {
                    const a = alignClass(col.align);
                    return (
                      <td key={col.id} className={`px-4 py-2 ${a.td} ${col.cellClassName ?? ''}`.trim()}>
                        {col.render(row)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  if (embedded) {
    return body;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        {titleIcon != null && (
          <span className="shrink-0 text-indigo-600 dark:text-indigo-400 [&>svg]:w-4 [&>svg]:h-4" aria-hidden>
            {titleIcon}
          </span>
        )}
        {title ? <AppText variant="h2" className="text-sm" text={title} /> : null}
      </div>
      {body}
    </div>
  );
}

export default AppDataTable;
