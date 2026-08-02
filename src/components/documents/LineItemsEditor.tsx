/**
 * Shared line items editor used by both QuotationForm and InvoiceForm.
 * Provides single-row edit mode, qty/hrs toggle, catalogue search, and compact view rows.
 */

import { useState, useCallback, useMemo } from 'react';
import type { Item } from '../../types/item';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { formatCurrency } from '../../utils/currency';
import { computeStockAvailability } from '../../utils/stockAvailability';

export interface LineRow {
  id: string;
  itemId?: number;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discountPercent: number;
  unit_type: 'qty' | 'hrs';
}

export function lineTotal(row: LineRow): number {
  const beforeDiscount = row.quantity * row.unit_price;
  return beforeDiscount * (1 - row.discountPercent / 100);
}

interface LineItemsEditorProps {
  rows: LineRow[];
  stockItems: Item[];
  currency: string;
  onChange: (rows: LineRow[]) => void;
  /**
   * itemId -> quantity to add back onto live stock before comparing — pass the
   * originally-loaded invoice's own line quantities when editing an existing
   * invoice. Omit for quotations and new invoices.
   */
  stockBaseline?: Record<number, number>;
  /**
   * When true (credit notes), still show the live "in stock" count per row but
   * never render the short/insufficient styling — restoring stock is never
   * insufficient.
   */
  disableStockWarnings?: boolean;
}

const inputClass =
  'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
const readonlyClass = 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed';
const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
const groupClass = 'flex flex-col';

export function LineItemsEditor({
  rows,
  stockItems,
  currency,
  onChange,
  stockBaseline,
  disableStockWarnings,
}: LineItemsEditorProps) {
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

  const availability = useMemo(
    () => computeStockAvailability(rows, stockItems, stockBaseline),
    [rows, stockItems, stockBaseline]
  );

  const addLine = useCallback(() => {
    const id = crypto.randomUUID?.() ?? `line-${Date.now()}`;
    onChange([...rows, { id, description: '', quantity: 1, unit_price: 0, discountPercent: 0, unit_type: 'qty' }]);
    setActiveLineId(id);
  }, [rows, onChange]);

  const removeLine = useCallback((id: string) => {
    onChange(rows.filter((r) => r.id !== id));
    setActiveLineId((prev) => (prev === id ? null : prev));
  }, [rows, onChange]);

  const updateLine = useCallback((id: string, updates: Partial<LineRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, [rows, onChange]);

  const onItemSelect = useCallback(
    (rowId: string) => (item: Item) => {
      updateLine(rowId, {
        itemId: item.id,
        sku: item.sku || '',
        description: item.name,
        unit_price: item.unit_price ?? 0,
      });
    },
    [updateLine]
  );

  const thCls = 'px-2 py-1 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-600';
  const tdCls = 'px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200';

  const hasRows = rows.length > 0;

  return (
    <div className="mb-1">
      {hasRows && (
        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-600 mb-1">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700/60">
              <tr>
                <th className={`${thCls} w-7`}>#</th>
                <th className={`${thCls} w-20`}>SKU</th>
                <th className={thCls}>Description</th>
                <th className={`${thCls} w-20 text-right`}>Qty / Hrs</th>
                <th className={`${thCls} w-24 text-right`}>Unit Price</th>
                <th className={`${thCls} w-16 text-right`}>Disc %</th>
                <th className={`${thCls} w-24 text-right`}>Total</th>
                <th className={`${thCls} w-14`} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) =>
                activeLineId === row.id ? (
                  /* ── edit mode (full-width colspan row) ── */
                  <tr key={row.id} className="bg-indigo-50 dark:bg-indigo-900/20">
                    <td colSpan={8} className="p-2">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-12 md:items-end">
                        <div className="md:col-span-5">
                          <div className={groupClass}>
                            <label className={labelClass}>Search catalogue (optional)</label>
                            <AppLabledAutocomplete
                              label=""
                              options={stockItems}
                              value={row.itemId != null ? String(row.itemId) : ''}
                              displayValue=""
                              accessor="name"
                              valueAccessor="id"
                              onSelect={onItemSelect(row.id)}
                              onClear={() => {}}
                              placeholder="Search item to pre-fill…"
                              className="mb-0"
                            />
                          </div>
                          <div className={`${groupClass} mt-2`}>
                            <label className={labelClass}>Description *</label>
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateLine(row.id, { description: e.target.value })}
                              className={inputClass}
                              placeholder="Item description"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className={`${groupClass} md:col-span-2`}>
                          <label className={labelClass}>{row.unit_type === 'hrs' ? 'Hrs' : 'Qty'}</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              min={row.unit_type === 'hrs' ? 0.01 : 1}
                              step={row.unit_type === 'hrs' ? '0.01' : '1'}
                              value={row.quantity === 0 ? '' : row.quantity}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (row.unit_type === 'hrs') {
                                  const n = parseFloat(raw);
                                  updateLine(row.id, { quantity: Number.isFinite(n) ? n : 0 });
                                } else {
                                  updateLine(row.id, { quantity: parseInt(raw, 10) || 0 });
                                }
                              }}
                              className={`${inputClass} flex-1`}
                            />
                            <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600 text-xs font-medium shrink-0">
                              <button
                                type="button"
                                onClick={() => updateLine(row.id, { unit_type: 'qty' })}
                                className={`px-2 py-1 transition-colors ${row.unit_type === 'qty' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                              >
                                Qty
                              </button>
                              <button
                                type="button"
                                onClick={() => updateLine(row.id, { unit_type: 'hrs' })}
                                className={`px-2 py-1 transition-colors ${row.unit_type === 'hrs' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                              >
                                Hrs
                              </button>
                            </div>
                          </div>
                          {row.itemId != null && (() => {
                            const entry = availability.get(row.itemId);
                            if (!entry) return null;
                            const short = entry.short && !disableStockWarnings;
                            return (
                              <div className={`mt-1 text-xs ${short ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                                {short
                                  ? `Only ${entry.available} available (need ${entry.requested})`
                                  : `${entry.available} in stock`}
                              </div>
                            );
                          })()}
                        </div>
                        <div className={`${groupClass} md:col-span-1`}>
                          <label className={labelClass}>Unit price</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={row.unit_price || ''}
                            onChange={(e) => updateLine(row.id, { unit_price: parseFloat(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className={`${groupClass} md:col-span-1`}>
                          <label className={labelClass}>Disc %</label>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            max={100}
                            value={row.discountPercent || ''}
                            onChange={(e) => updateLine(row.id, { discountPercent: parseFloat(e.target.value) || 0 })}
                            className={inputClass}
                          />
                        </div>
                        <div className={`${groupClass} md:col-span-2`}>
                          <label className={labelClass}>Total</label>
                          <input
                            type="text"
                            readOnly
                            value={formatCurrency(lineTotal(row), currency)}
                            className={`${inputClass} ${readonlyClass}`}
                          />
                        </div>
                        <div className="flex items-end gap-1 md:col-span-1">
                          <button
                            type="button"
                            onClick={() => setActiveLineId(null)}
                            className="flex-1 px-2 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(row.id)}
                            className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            aria-label="Remove line"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ── view mode (table row) ── */
                  <tr
                    key={row.id}
                    className={`group border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-700/20' : ''}`}
                    onClick={() => setActiveLineId(row.id)}
                  >
                    <td className={`${tdCls} text-gray-400`}>{idx + 1}</td>
                    <td className={`${tdCls} text-gray-500 dark:text-gray-400 font-mono`}>{row.sku || '—'}</td>
                    <td className={tdCls}>
                      {row.description || <span className="italic text-gray-400">No description</span>}
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        {row.quantity}{row.unit_type === 'hrs' ? ' hrs' : ''}
                      </div>
                      {row.itemId != null && (() => {
                        const entry = availability.get(row.itemId);
                        if (!entry) return null;
                        const short = entry.short && !disableStockWarnings;
                        return (
                          <div className={`text-[11px] ${short ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                            {short ? `Only ${entry.available} available` : `${entry.available} in stock`}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>{formatCurrency(row.unit_price, currency)}</td>
                    <td className={`${tdCls} text-right tabular-nums text-gray-500`}>
                      {row.discountPercent > 0 ? `${row.discountPercent}%` : '—'}
                    </td>
                    <td className={`${tdCls} text-right tabular-nums font-medium`}>{formatCurrency(lineTotal(row), currency)}</td>
                    <td className={tdCls}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveLineId(row.id); }}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded"
                          aria-label="Edit line"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeLine(row.id); }}
                          className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          aria-label="Remove line"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        onClick={addLine}
        className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        + Add line
      </button>
    </div>
  );
}

export default LineItemsEditor;
