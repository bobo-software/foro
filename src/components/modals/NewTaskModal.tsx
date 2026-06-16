import { useEffect, useMemo, useState } from 'react';
import { LuListPlus } from 'react-icons/lu';
import { AppModal } from './AppModal';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import ProjectService from '@/services/projectService';
import TaskService from '@/services/taskService';
import TaskChecklistService from '@/services/taskChecklistService';
import type { Project } from '@/types/project';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '@/types/task';
import type { TaskCategory } from '@/types/taskCategory';
import { DEFAULT_TASK_CATEGORIES } from '@/types/taskCategory';
import { DraftChecklistSection, type DraftChecklistItem } from '@/components/tasks/DraftChecklistSection';

const PRIORITY_LABELS = ['None', 'Low', 'Normal', 'High', 'Urgent'];
const PRIORITY_VALUE: Record<string, ProjectTaskPriority | null> = {
  None: null, Low: 'low', Normal: 'normal', High: 'high', Urgent: 'urgent',
};

export interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  assignedToUserId?: number | null;
  /** Pre-select a project and hide the project selector */
  defaultProjectId?: number;
  /** Dynamic categories for the project — falls back to defaults if not provided */
  categories?: TaskCategory[];
  onCreated: (task: ProjectTask) => void;
}

export function NewTaskModal({
  isOpen,
  onClose,
  businessId,
  assignedToUserId,
  defaultProjectId,
  categories,
  onCreated,
}: NewTaskModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusLabel, setStatusLabel] = useState('');
  const [priorityLabel, setPriorityLabel] = useState('None');
  const [dueOn, setDueOn] = useState('');
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState<DraftChecklistItem[]>([]);

  // Build status options from dynamic categories or static defaults
  const statusOptions = useMemo(() => {
    const cats: Array<{ name: string; slug: string }> =
      categories && categories.length > 0 ? categories : DEFAULT_TASK_CATEGORIES;
    return cats.map((c) => c.name);
  }, [categories]);

  const statusSlugByName = useMemo(() => {
    const cats: Array<{ name: string; slug: string }> =
      categories && categories.length > 0 ? categories : DEFAULT_TASK_CATEGORIES;
    return Object.fromEntries(cats.map((c) => [c.name, c.slug])) as Record<string, ProjectTaskStatus>;
  }, [categories]);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setSaving(false);
    setTitle('');
    setStatusLabel(statusOptions[0] ?? 'To Do');
    setPriorityLabel('None');
    setDueOn('');
    setDescription('');
    setChecklistItems([]);
    setSelectedProject(null);

    if (defaultProjectId != null) return;

    setProjectsLoading(true);
    ProjectService.findAll({
      where: { business_id: businessId },
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    })
      .then((rows) => {
        setProjects(rows);
        if (rows.length > 0) setSelectedProject(rows[0]);
      })
      .finally(() => setProjectsLoading(false));
  }, [isOpen, businessId, defaultProjectId, statusOptions]);

  const handleSubmit = async () => {
    if (!title.trim()) { setFormError('Task title is required.'); return; }
    const projectId = defaultProjectId ?? selectedProject?.id;
    if (projectId == null) { setFormError('Please select a project.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const task = await TaskService.create({
        business_id: businessId,
        project_id: projectId,
        title: title.trim(),
        status: statusSlugByName[statusLabel] ?? 'todo',
        priority: PRIORITY_VALUE[priorityLabel] ?? null,
        due_on: dueOn || null,
        description: description.trim() || null,
        assigned_to_user_id: assignedToUserId != null && Number.isFinite(assignedToUserId) ? assignedToUserId : null,
      });

      if (checklistItems.length > 0 && task.id != null) {
        const checklistId = await TaskChecklistService.ensureChecklistForTask(task.id, businessId, projectId);
        for (let i = 0; i < checklistItems.length; i++) {
          const item = checklistItems[i];
          await TaskChecklistService.createItem({
            business_id: businessId,
            project_id: projectId,
            checklist_id: checklistId,
            label: item.label,
            is_done: item.is_done,
            position: i,
          });
        }
      }

      onCreated(task);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create task.');
      setSaving(false);
    }
  };

  const projectLocked = defaultProjectId != null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="Add Task"
      titleIcon={<LuListPlus size={16} />}
      size="xl"
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      buttons={[
        { label: 'Cancel', variant: 'secondary', onClick: onClose, disabled: saving },
        {
          label: 'Create Task',
          variant: 'primary',
          onClick: () => void handleSubmit(),
          loading: saving,
          loadingLabel: 'Creating…',
          disabled: projectsLoading,
        },
      ]}
    >
      <div className="space-y-4">
        {formError && <p className="text-red-600 dark:text-red-400 text-xs">{formError}</p>}

        {!projectLocked && (
          <AppLabledAutocomplete
            label="Project"
            options={projects}
            accessor="name"
            valueAccessor="id"
            displayValue={selectedProject?.name ?? ''}
            value={selectedProject?.id != null ? String(selectedProject.id) : ''}
            onSelect={(item: Project) => setSelectedProject(item)}
            onClear={() => setSelectedProject(null)}
            placeholder={projectsLoading ? 'Loading projects…' : 'Search project…'}
            disabled={saving || projectsLoading}
            required
          />
        )}

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

        <DraftChecklistSection items={checklistItems} onChange={setChecklistItems} disabled={saving} />
      </div>
    </AppModal>
  );
}

export default NewTaskModal;
