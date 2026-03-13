/**
 * Shared line items editor used by both QuotationForm and InvoiceForm.
 * Provides single-row edit mode, qty/hrs toggle, catalogue search, and compact view rows.
 */

import { useState, useCallback } from 'react';
import type { Item } from '../../types/item';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { formatCurrency } from '../../utils/currency';

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
}

const inputClass =
  'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
const readonlyClass = 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed';
const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
const groupClass = 'flex flex-col';

export function LineItemsEditor({ rows, stockItems, currency, onChange }: LineItemsEditorProps) {
  const [activeLineId, setActiveLineId] = useState<string | null>(null);

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

  return (
    <div className="mb-1 space-y-1">
      {rows.map((row) =>
        activeLineId === row.id ? (
          /* ── edit mode ── */
          <div
            key={row.id}
            className="grid grid-cols-1 gap-2 p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 md:grid-cols-12 md:items-end"
          >
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
                  min={1}
                  value={row.quantity || ''}
                  onChange={(e) => updateLine(row.id, { quantity: parseInt(e.target.value, 10) || 0 })}
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
        ) : (
          /* ── view mode ── */
          <div
            key={row.id}
            className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/40 group"
          >
            <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 truncate">
              {row.description || <span className="italic text-gray-400">No description</span>}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {row.quantity}{row.unit_type === 'hrs' ? ' hrs' : ''} × {formatCurrency(row.unit_price, currency)}
              {row.discountPercent > 0 && ` − ${row.discountPercent}%`}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
              {formatCurrency(lineTotal(row), currency)}
            </span>
            <button
              type="button"
              onClick={() => setActiveLineId(row.id)}
              className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Edit line"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => removeLine(row.id)}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove line"
            >
              ×
            </button>
          </div>
        )
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
