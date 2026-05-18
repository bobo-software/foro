import { useCallback, useEffect, useState } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import TaskChecklistService from '@/services/taskChecklistService';
import type { ProjectTask } from '@/types/task';
import type { ProjectTaskChecklistItem } from '@/types/taskChecklist';

export interface TaskChecklistsSectionProps {
  task: ProjectTask;
  businessId: number;
  disabled?: boolean;
}

const inlineInputCls =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';

export function TaskChecklistsSection({ task, businessId, disabled }: TaskChecklistsSectionProps) {
  const taskId = task.id;
  const projectId = task.project_id;

  const [items, setItems] = useState<ProjectTaskChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');

  const load = useCallback(async () => {
    if (taskId == null) {
      setItems([]);
      return;
    }
    setLoading(true);
    setSectionError(null);
    try {
      const rows = await TaskChecklistService.listItemsByTask(taskId, businessId);
      setItems(rows);
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : 'Failed to load checklist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggleItem = async (itemId: number, isDone: boolean) => {
    if (disabled) return;
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, is_done: isDone } : it)));
    try {
      await TaskChecklistService.updateItem(itemId, businessId, {
        is_done: isDone,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : 'Failed to update item');
      void load();
    }
  };

  const handleUpdateItemLabel = async (itemId: number, label: string) => {
    if (disabled || !label.trim()) return;
    try {
      await TaskChecklistService.updateItem(itemId, businessId, {
        label: label.trim(),
        updated_at: new Date().toISOString(),
      });
      setItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, label: label.trim() } : it))
      );
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (disabled) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
    try {
      await TaskChecklistService.deleteItem(itemId, businessId);
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : 'Failed to delete item');
      void load();
    }
  };

  const handleAddItem = async () => {
    if (disabled || taskId == null) return;
    const label = newItemLabel.trim();
    if (!label) return;
    setSectionError(null);
    try {
      const checklistId = await TaskChecklistService.ensureChecklistForTask(
        taskId,
        businessId,
        projectId
      );
      const created = await TaskChecklistService.createItem({
        business_id: businessId,
        project_id: projectId,
        checklist_id: checklistId,
        label,
        position: items.length,
      });
      setNewItemLabel('');
      setItems((prev) => [...prev, created]);
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : 'Failed to add item');
    }
  };

  if (taskId == null) return null;

  return (
    <section className="space-y-2 border-t border-slate-200 dark:border-slate-600 pt-4">
      {sectionError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {sectionError}
        </p>
      )}

      {loading && items.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading checklist…</p>
      )}

      <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {items.map((item) => {
          if (item.id == null) return null;
          const itemId = item.id;
          const itemInputId = `task-${taskId}-checklist-item-${itemId}`;
          return (
            <li key={itemId} className="flex items-start gap-2 group">
              <input
                type="checkbox"
                checked={item.is_done}
                disabled={disabled}
                onChange={(e) => void handleToggleItem(itemId, e.target.checked)}
                className="mt-2 h-4 w-4 rounded border-slate-300 dark:border-slate-500 shrink-0"
                aria-label={`Mark "${item.label}" done`}
              />
              <div className="flex-1 min-w-0">
                <label htmlFor={itemInputId} className="sr-only">
                  Checklist item
                </label>
                <input
                  id={itemInputId}
                  type="text"
                  value={item.label}
                  disabled={disabled}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === itemId ? { ...it, label: e.target.value } : it
                      )
                    )
                  }
                  onBlur={(e) => void handleUpdateItemLabel(itemId, e.target.value)}
                  className={`${inlineInputCls} ${item.is_done ? 'line-through opacity-60' : ''}`}
                />
              </div>
              <button
                type="button"
                title="Delete item"
                disabled={disabled}
                onClick={() => void handleDeleteItem(itemId)}
                className="shrink-0 mt-1.5 p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
              >
                <LuTrash2 size={14} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor={`task-${taskId}-new-checklist-item`} className="sr-only">
            New checklist item
          </label>
          <input
            id={`task-${taskId}-new-checklist-item`}
            type="text"
            value={newItemLabel}
            disabled={disabled}
            onChange={(e) => setNewItemLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAddItem();
              }
            }}
            placeholder="Add checklist item…"
            className={inlineInputCls}
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleAddItem()}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50"
        >
          <LuPlus size={12} aria-hidden />
          Add item
        </button>
      </div>
    </section>
  );
}

export default TaskChecklistsSection;
