import { useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';

export interface DraftChecklistItem {
  id: string;
  label: string;
  is_done: boolean;
}

export interface DraftChecklistSectionProps {
  items: DraftChecklistItem[];
  onChange: (items: DraftChecklistItem[]) => void;
  disabled?: boolean;
}

const inlineInputCls =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';

/** Local-only checklist editor for forms where the parent record doesn't exist yet (e.g. new task creation). */
export function DraftChecklistSection({ items, onChange, disabled }: DraftChecklistSectionProps) {
  const [newItemLabel, setNewItemLabel] = useState('');

  const handleAddItem = () => {
    if (disabled) return;
    const label = newItemLabel.trim();
    if (!label) return;
    const id = crypto.randomUUID?.() ?? `checklist-${Date.now()}-${Math.random()}`;
    onChange([...items, { id, label, is_done: false }]);
    setNewItemLabel('');
  };

  return (
    <section className="space-y-2 border-t border-slate-200 dark:border-slate-600 pt-4">
      <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 group">
            <input
              type="checkbox"
              checked={item.is_done}
              disabled={disabled}
              onChange={(e) =>
                onChange(items.map((it) => (it.id === item.id ? { ...it, is_done: e.target.checked } : it)))
              }
              className="mt-2 h-4 w-4 rounded border-slate-300 dark:border-slate-500 shrink-0"
              aria-label={`Mark "${item.label}" done`}
            />
            <div className="flex-1 min-w-0">
              <label htmlFor={`draft-checklist-item-${item.id}`} className="sr-only">
                Checklist item
              </label>
              <input
                id={`draft-checklist-item-${item.id}`}
                type="text"
                value={item.label}
                disabled={disabled}
                onChange={(e) =>
                  onChange(items.map((it) => (it.id === item.id ? { ...it, label: e.target.value } : it)))
                }
                className={`${inlineInputCls} ${item.is_done ? 'line-through opacity-60' : ''}`}
              />
            </div>
            <button
              type="button"
              title="Delete item"
              disabled={disabled}
              onClick={() => onChange(items.filter((it) => it.id !== item.id))}
              className="shrink-0 mt-1.5 p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
            >
              <LuTrash2 size={14} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="draft-checklist-new-item" className="sr-only">
            New checklist item
          </label>
          <input
            id="draft-checklist-new-item"
            type="text"
            value={newItemLabel}
            disabled={disabled}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItem();
              }
            }}
            placeholder="Add checklist item…"
            className={inlineInputCls}
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAddItem}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <LuPlus size={12} aria-hidden />
          Add item
        </button>
      </div>
    </section>
  );
}

export default DraftChecklistSection;
