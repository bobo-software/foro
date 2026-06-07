import { useEffect, useState } from 'react';
import { LuSettings2, LuPlus, LuTrash2, LuGripVertical } from 'react-icons/lu';
import { AppModal } from './AppModal';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import TaskCategoryService from '@/services/taskCategoryService';
import type { TaskCategory } from '@/types/taskCategory';

// Color palette — each entry maps a hex to Tailwind classes used by the kanban
export const CATEGORY_COLOR_PRESETS = [
  { hex: '#94a3b8', label: 'Slate' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#f59e0b', label: 'Amber' },
  { hex: '#06b6d4', label: 'Cyan' },
  { hex: '#84cc16', label: 'Lime' },
  { hex: '#ec4899', label: 'Pink' },
  { hex: '#f97316', label: 'Orange' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 50);
}

function colorAt(index: number): string {
  return CATEGORY_COLOR_PRESETS[index % CATEGORY_COLOR_PRESETS.length].hex;
}

type Row = TaskCategory & { _deleted?: boolean; _dirty?: boolean };

export interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  businessId: number;
  categories: TaskCategory[];
  taskCountBySlug: Record<string, number>;
  onSaved: (updated: TaskCategory[]) => void;
}

export function ManageCategoriesModal({
  isOpen,
  onClose,
  projectId,
  businessId,
  categories,
  taskCountBySlug,
  onSaved,
}: ManageCategoriesModalProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRows(categories.map((c) => ({ ...c })));
    setNewName('');
    setError(null);
    setSaving(false);
  }, [isOpen, categories]);

  const updateRow = (index: number, name: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, name, _dirty: true } : r))
    );
  };

  const changeColor = (index: number, color: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, color, _dirty: true } : r))
    );
  };

  const markDeleted = (index: number) => {
    const row = rows[index];
    const count = row.slug ? (taskCountBySlug[row.slug] ?? 0) : 0;
    if (count > 0) {
      setError(
        `"${row.name}" has ${count} task${count !== 1 ? 's' : ''} — move or reassign them before deleting this category.`
      );
      return;
    }
    setError(null);
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, _deleted: true } : r)));
  };

  const addCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const slug = slugify(trimmed);
    if (!slug) { setError('Category name must contain letters or numbers.'); return; }
    if (rows.some((r) => !r._deleted && r.slug === slug)) {
      setError(`A category with slug "${slug}" already exists.`);
      return;
    }
    setError(null);
    const color = colorAt(rows.filter((r) => !r._deleted).length);
    setRows((prev) => [
      ...prev,
      { business_id: businessId, project_id: projectId, name: trimmed, slug, color, position: prev.length },
    ]);
    setNewName('');
  };

  const handleSave = async () => {
    const visibleNames = rows.filter((r) => !r._deleted).map((r) => r.name.trim());
    if (visibleNames.some((n) => !n)) { setError('Category names cannot be empty.'); return; }
    setSaving(true);
    setError(null);
    try {
      // Delete removed rows
      for (const row of rows.filter((r) => r._deleted && r.id != null)) {
        await TaskCategoryService.delete(row.id!);
      }
      // Update dirty rows
      const kept = rows.filter((r) => !r._deleted);
      for (let i = 0; i < kept.length; i++) {
        const row = kept[i];
        if (row.id == null) {
          // New row — create
          await TaskCategoryService.create({
            business_id: businessId,
            project_id: projectId,
            name: row.name.trim(),
            slug: row.slug,
            color: row.color ?? null,
            position: i,
          });
        } else if (row._dirty || row.position !== i) {
          await TaskCategoryService.update(row.id, {
            name: row.name.trim(),
            color: row.color ?? null,
            position: i,
          });
        }
      }
      const refreshed = await TaskCategoryService.findByProject(projectId, businessId);
      onSaved(refreshed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes.');
      setSaving(false);
    }
  };

  const visible = rows.filter((r) => !r._deleted);

  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Manage Categories"
      titleIcon={<LuSettings2 size={16} />}
      size="lg"
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      buttons={[
        { label: 'Cancel', variant: 'secondary', onClick: onClose, disabled: saving },
        {
          label: 'Save changes',
          variant: 'primary',
          onClick: () => void handleSave(),
          loading: saving,
          loadingLabel: 'Saving…',
        },
      ]}
    >
      <div className="space-y-3">
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

        {/* Category rows */}
        <div className="space-y-1.5">
          {visible.map((row, i) => (
            <div
              key={row.id ?? row.slug}
              className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-3 py-2"
            >
              <LuGripVertical size={14} className="text-slate-300 dark:text-slate-600 shrink-0" />

              {/* Color swatch picker */}
              <div className="relative shrink-0">
                <div
                  className="w-5 h-5 rounded-full border border-white dark:border-slate-700 shadow-sm"
                  style={{ background: row.color ?? '#94a3b8' }}
                />
                <select
                  className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  value={row.color ?? '#94a3b8'}
                  onChange={(e) => changeColor(i, e.target.value)}
                  aria-label={`Color for ${row.name}`}
                >
                  {CATEGORY_COLOR_PRESETS.map((p) => (
                    <option key={p.hex} value={p.hex}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Name input */}
              <AppInputLabeled
                label="Category name"
                value={row.name}
                onChange={(e) => updateRow(i, e.target.value)}
                placeholder="Category name"
                disabled={saving}
                className="flex-1 min-w-0 [&_label]:sr-only"
              />

              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                {row.slug}
              </span>

              {/* Task count badge */}
              {(taskCountBySlug[row.slug] ?? 0) > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 shrink-0">
                  {taskCountBySlug[row.slug]}
                </span>
              )}

              <button
                type="button"
                onClick={() => markDeleted(i)}
                disabled={saving}
                title="Delete category"
                className="shrink-0 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
              >
                <LuTrash2 size={14} />
              </button>
            </div>
          ))}

          {visible.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">
              No categories — add one below.
            </p>
          )}
        </div>

        {/* Add new */}
        <div className="flex items-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700">
          <div className="flex-1">
            <AppInputLabeled
              label="New category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. In QA, Deployed…"
              disabled={saving}
            />
          </div>
          <button
            type="button"
            onClick={addCategory}
            disabled={saving || !newName.trim()}
            className="mb-0.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            <LuPlus size={14} />
            Add
          </button>
        </div>
      </div>
    </AppModal>
  );
}

export default ManageCategoriesModal;
