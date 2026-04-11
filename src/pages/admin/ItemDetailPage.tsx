import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ItemService from '@/services/itemService';
import StockItemBomService from '@/services/stockItemBomService';
import type { Item, StockItemBomLineWithComponent } from '@/types/item';
import { formatCurrency } from '@/utils/currency';

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Item | null>(null);
  const [bomLines, setBomLines] = useState<StockItemBomLineWithComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const itemId = Number(id);
    Promise.all([ItemService.findById(itemId), StockItemBomService.findByParentId(itemId)])
      .then(async ([data, lines]) => {
        if (cancelled) return;
        setItem(data);
        if (!data || data.item_type !== 'manufactured' || lines.length === 0) {
          setBomLines([]);
          return;
        }
        const enriched = await Promise.all(
          lines.map(async (l) => {
            const comp = await ItemService.findById(l.component_item_id);
            return {
              ...l,
              component_name: comp?.name,
              component_sku: comp?.sku,
            };
          }),
        );
        if (!cancelled) setBomLines(enriched);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load item');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="text-slate-500">Loading…</div>;
  }
  if (error || !item) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error ?? 'Item not found.'}</p>
        <Link
          to="/app/items"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500 no-underline"
        >
          ← Back to stock
        </Link>
      </div>
    );
  }

  const itemTypeLabel = item.item_type === 'manufactured' ? 'Manufactured' : 'Single';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/app/items"
            className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-500 no-underline"
          >
            ← Back to stock
          </Link>
          <h1 className="truncate text-2xl font-bold text-slate-800">{item.name}</h1>
        </div>
        <Link
          to={`/app/items/${item.id}/edit`}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          Edit
        </Link>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Type</dt>
            <dd className="mt-1 text-slate-800">{itemTypeLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">SKU</dt>
            <dd className="mt-1 text-slate-800">{item.sku ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Quantity</dt>
            <dd className="mt-1 text-slate-800">{item.quantity ?? 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Selling price</dt>
            <dd className="mt-1 text-slate-800">{formatCurrency(item.unit_price)}</dd>
          </div>
          {item.cost_price != null && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Cost price</dt>
              <dd className="mt-1 text-slate-800">{formatCurrency(item.cost_price)}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm font-medium text-slate-500">Tax rate</dt>
            <dd className="mt-1 text-slate-800">{item.tax_rate != null ? `${item.tax_rate}%` : '—'}</dd>
          </div>
          {item.description && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-slate-800 whitespace-pre-wrap">{item.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {item.item_type === 'manufactured' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Bill of materials</h2>
          <p className="mb-3 text-sm text-slate-500">Quantities are per one unit of this item.</p>
          {bomLines.length === 0 ? (
            <p className="text-sm text-slate-600">No components defined.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Component</th>
                    <th className="pb-2 pr-4 font-medium">SKU</th>
                    <th className="pb-2 font-medium text-right">Qty per unit</th>
                  </tr>
                </thead>
                <tbody>
                  {bomLines.map((line) => (
                    <tr key={line.id ?? `${line.component_item_id}-${line.quantity_per}`} className="border-b border-slate-100">
                      <td className="py-2 pr-4 text-slate-800">{line.component_name ?? `Item #${line.component_item_id}`}</td>
                      <td className="py-2 pr-4 text-slate-600">{line.component_sku ?? '—'}</td>
                      <td className="py-2 text-right tabular-nums text-slate-800">{line.quantity_per}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
