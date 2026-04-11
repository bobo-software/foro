import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuEye, LuFilter, LuPackage, LuPencil, LuTrash2 } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useItemStore } from '../../stores/data/ItemStore';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useAutoRefresh, useProjectId } from '../../hooks';
import type { Item } from '../../types/item';
import { formatCurrency } from '../../utils/currency';

export function ItemList() {
  const navigate = useNavigate();
  const { items, loading, error, fetchItems, removeItem } = useItemStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const projectId = useProjectId();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchItems();
  }, [fetchItems, businessId]);

  useAutoRefresh(projectId, 'items', fetchItems);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Are you sure you want to delete this item?')) return;
      try {
        await removeItem(id);
      } catch (err: unknown) {
        alert('Failed to delete item: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    },
    [removeItem],
  );

  const columns = useMemo<AppDataTableColumn<Item>[]>(
    () => [
      {
        id: 'sku',
        header: 'SKU',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => row.sku ?? '—',
      },
      {
        id: 'item_type',
        header: 'Type',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => (row.item_type === 'manufactured' ? 'Manufactured' : 'Single'),
      },
      {
        id: 'name',
        header: 'Name',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => row.name,
      },
      {
        id: 'quantity',
        header: 'Quantity',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => row.quantity ?? 0,
      },
      {
        id: 'unit_price',
        header: 'Stock price',
        align: 'right',
        cellClassName: 'tabular-nums text-slate-800 dark:text-slate-100',
        render: (row) => formatCurrency(Number(row.unit_price ?? 0)),
      },
      {
        id: 'cost_price',
        header: 'Cost price',
        align: 'right',
        cellClassName: 'tabular-nums text-slate-600 dark:text-slate-300',
        render: (row) =>
          row.cost_price != null ? formatCurrency(Number(row.cost_price)) : '—',
      },
      {
        id: 'tax_rate',
        header: 'Tax rate',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => (row.tax_rate != null ? `${row.tax_rate}%` : '—'),
      },
      {
        id: 'actions',
        header: 'Actions',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (row) => {
          const id = row.id;
          if (id == null) return null;
          return (
            <div
              className="inline-flex items-center justify-end gap-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/app/items/${id}`}
                className="inline-flex rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                title="View"
                aria-label="View item"
              >
                <LuEye className="h-4 w-4" />
              </Link>
              <Link
                to={`/app/items/${id}/edit`}
                className="inline-flex rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                title="Edit"
                aria-label="Edit item"
              >
                <LuPencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                className="inline-flex rounded-md p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                title="Delete"
                aria-label="Delete item"
                onClick={() => handleDelete(id)}
              >
                <LuTrash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [handleDelete],
  );

  const emptyMessage = search.trim() ? 'No items match your search.' : 'No items yet.';

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Stock items</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading items…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Stock items</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your stock items</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search items"
          />
        </div>
        <Link
          to="/app/items/create"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          + Add item
        </Link>
      </div>

      <AppDataTable<Item>
        title="Stock items"
        titleIcon={<LuPackage />}
        columns={columns}
        data={filteredItems}
        getRowKey={(row, index) => row.id ?? `item-${index}`}
        onRowClick={(row) => {
          if (row.id != null) navigate(`/app/items/${row.id}`);
        }}
        error={error}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
