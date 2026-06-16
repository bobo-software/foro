import { useEffect, useMemo, useState } from 'react';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import { AppModal } from './AppModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import TaskService from '@/services/taskService';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '@/types/task';
import type { TaskCategory } from '@/types/taskCategory';
import { DEFAULT_TASK_CATEGORIES } from '@/types/taskCategory';
import { TaskChecklistsSection } from '@/components/tasks/TaskChecklistsSection';

const PRIORITY_LABELS = ['None', 'Low', 'Normal', 'High', 'Urgent'];
const PRIORITY_VALUE: Record<string, ProjectTaskPriority | null> = {
  None: null, Low: 'low', Normal: 'normal', High: 'high', Urgent: 'urgent',
};
const PRIORITY_FROM_VALUE: Record<string, string> = {
  low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent',
};

export interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: ProjectTask | null;
  /** Dynamic categories for the project — falls back to defaults if not provided */
  categories?: TaskCategory[];
  onSaved: () => void;
  onDeleted: () => void;
}

export function EditTaskModal({ isOpen, onClose, task, categories, onSaved, onDeleted }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [priorityLabel, setPriorityLabel] = useState('None');
  const [dueOn, setDueOn] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusOptions = useMemo(() => {
    const cats: Array<{ name: string; slug: string }> =
      categories && categories.length > 0 ? categories : DEFAULT_TASK_CATEGORIES;
    return cats.map((c) => c.name);
  }, [categories]);

  const statusNameBySlug = useMemo(() => {
    const cats: Array<{ name: string; slug: string }> =
      categories && categories.length > 0 ? categories : DEFAULT_TASK_CATEGORIES;
    return Object.fromEntries(cats.map((c) => [c.slug, c.name])) as Record<string, string>;
  }, [categories]);

  const statusSlugByName = useMemo(() => {
    const cats: Array<{ name: string; slug: string }> =
      categories && categories.length > 0 ? categories : DEFAULT_TASK_CATEGORIES;
    return Object.fromEntries(cats.map((c) => [c.name, c.slug])) as Record<string, ProjectTaskStatus>;
  }, [categories]);

  useEffect(() => {
    if (!isOpen || task == null) return;
    setTitle(task.title);
    const slug = String(task.status ?? 'todo');
    setStatusLabel(statusNameBySlug[slug] ?? statusOptions[0] ?? 'To Do');
    setPriorityLabel(task.priority ? (PRIORITY_FROM_VALUE[String(task.priority)] ?? 'None') : 'None');
    setDueOn(task.due_on ? String(task.due_on).slice(0, 10) : '');
    setDescription(task.description != null ? String(task.description) : '');
    setFormError(null);
    setSaving(false);
    setShowDeleteConfirm(false);
  }, [isOpen, task, statusNameBySlug, statusOptions]);

  const handleSubmit = async () => {
    if (!title.trim()) { setFormError('Title is required.'); return; }
    if (task?.id == null) return;
    setSaving(true);
    setFormError(null);
    try {
      await TaskService.update(task.id, {
        title: title.trim(),
        status: statusSlugByName[statusLabel] ?? 'todo',
        priority: PRIORITY_VALUE[priorityLabel] ?? null,
        due_on: dueOn || null,
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      });
      onSaved();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save task.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (task?.id == null) return;
    setDeleting(true);
    setFormError(null);
    try {
      await TaskService.delete(task.id);
      onDeleted();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to delete task.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
    <AppModal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Edit Task"
      titleIcon={<LuPencil size={16} />}
      size="xl"
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      footer={
        <div className="w-full flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
          >
            <LuTrash2 size={14} aria-hidden />
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {formError && <p className="text-red-600 dark:text-red-400 text-xs">{formError}</p>}

        <AppInputLabeled
          label="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Write unit tests"
          required
          disabled={saving}
        />

        <div className="grid grid-cols-2 gap-4">
          <AppLabeledSelectInput
            label="Status"
            value={statusLabel}
            options={statusOptions}
            onChange={(e) => setStatusLabel(e.target.value)}
            disabled={saving}
          />

          <AppLabeledSelectInput
            label="Priority"
            value={priorityLabel}
            options={PRIORITY_LABELS}
            onChange={(e) => setPriorityLabel(e.target.value)}
            disabled={saving}
          />
        </div>

        <AppInputLabeled
          label="Due date"
          type="date"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
          disabled={saving}
        />

        <AppLabeledAreaInput
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details…"
          rows={3}
          disabled={saving}
        />

        {task != null && (
          <TaskChecklistsSection task={task} businessId={task.business_id} disabled={saving} />
        )}
      </div>
    </AppModal>

    <DeleteConfirmationModal
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={handleDelete}
      title="Delete Task"
      message={`Are you sure you want to delete "${task?.title ?? 'this task'}"? This will also delete its checklist items. This action cannot be undone.`}
      isLoading={deleting}
    />
    </>
  );
}

export default EditTaskModal;
