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
  const [activeTab, setActiveTab] = useState<'all' | 'single' | 'manufactured'>('all');

  useEffect(() => {
    fetchItems();
  }, [fetchItems, businessId]);

  useAutoRefresh(projectId, 'items', fetchItems);

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTab !== 'all') {
      result = result.filter((i) => i.item_type === activeTab);
    }
    if (!search.trim()) return result;
    const q = search.trim().toLowerCase();
    return result.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q),
    );
  }, [items, search, activeTab]);

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
        cellClassName: 'text-slate-600 dark:text-slate-300 max-w-[8rem]',
        render: (row) =>
          row.sku ? (
            <span className="block truncate" title={row.sku}>
              {row.sku}
            </span>
          ) : (
            '—'
          ),
      },
      {
        id: 'item_type',
        header: 'Type',
        headerClassName: 'w-24 whitespace-nowrap',
        cellClassName: 'text-slate-600 dark:text-slate-300 w-24 whitespace-nowrap',
        render: (row) => (row.item_type === 'manufactured' ? 'Manufactured' : 'Single'),
      },
      {
        id: 'name',
        header: 'Name',
        cellClassName: 'text-slate-600 dark:text-slate-300 max-w-[8rem]',
        render: (row) =>
          row.sku ? (
            <span className="block truncate" title={row.sku}>
              {row.sku}
            </span>
          ) : (
            '—'
          ),
      },
      {
        id: 'quantity',
        header: 'Quantity',
        align: 'right',
        headerClassName: 'w-24',
        cellClassName: 'tabular-nums text-slate-600 dark:text-slate-300 w-24',
        render: (row) => row.quantity ?? 0,
      },
      {
        id: 'unit_price',
        header: 'Stock price',
        headerClassName: 'w-24 whitespace-nowrap',
        cellClassName: 'text-slate-600 dark:text-slate-300 w-24 whitespace-nowrap tabular-nums',
        render: (row) => formatCurrency(Number(row.unit_price ?? 0)),
      },
      {
        id: 'cost_price',
        header: 'Cost price',
        align: 'right',
        headerClassName: 'w-24',
        cellClassName: 'tabular-nums text-slate-600 dark:text-slate-300 w-24',
        render: (row) =>
          row.cost_price != null ? formatCurrency(Number(row.cost_price)) : '—',
      },
      {
        id: 'tax_rate',
        header: 'Tax rate',
        align: 'right',
        headerClassName: 'w-24',
        cellClassName: 'tabular-nums text-slate-800 dark:text-slate-100 w-24',
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

  const emptyMessage = search.trim()
    ? 'No items match your search.'
    : activeTab === 'manufactured'
    ? 'No manufactured items yet.'
    : activeTab === 'single'
    ? 'No single items yet.'
    : 'No items yet.';

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Stock items</h1>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Loading items…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">
            Stock items
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">Manage your catalogue</span>
          </h1>
        </div>
        <Link
          to="/app/items/create"
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white no-underline hover:bg-indigo-500"
        >
          + Add item
        </Link>
      </div>

      {/* Tabs + search in one row */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        {([
          { key: 'all', label: 'All' },
          { key: 'single', label: 'Single' },
          { key: 'manufactured', label: 'Manufactured' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="relative ml-auto mb-0.5">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={13} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 pl-7 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            aria-label="Search items"
          />
        </div>
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
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
      />
    </div>
  );
}
