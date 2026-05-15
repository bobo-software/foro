import { useEffect, useMemo, useState } from 'react';
import { LuPencil } from 'react-icons/lu';
import { AppModal } from './AppModal';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import TaskService from '@/services/taskService';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '@/types/task';
import type { TaskCategory } from '@/types/taskCategory';
import { DEFAULT_TASK_CATEGORIES } from '@/types/taskCategory';

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
}

export function EditTaskModal({ isOpen, onClose, task, categories, onSaved }: EditTaskModalProps) {
  const [title, setTitle] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const [priorityLabel, setPriorityLabel] = useState('None');
  const [dueOn, setDueOn] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Edit Task"
      titleIcon={<LuPencil size={16} />}
      size="lg"
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      buttons={[
        { label: 'Cancel', variant: 'secondary', onClick: onClose, disabled: saving },
        {
          label: 'Save',
          variant: 'primary',
          onClick: () => void handleSubmit(),
          loading: saving,
          loadingLabel: 'Saving…',
        },
      ]}
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
      </div>
    </AppModal>
  );
}

export default EditTaskModal;
