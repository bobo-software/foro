import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import type { TeamMembership } from '@/types/team';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';
import AppLabledInput from '@/components/forms/AppLabledInput';
import AppLabledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';

type TaskDraft = {
  title: string;
  status: ProjectTaskStatus;
  due_on: string;
  assigned_to_user_id: number | null;
  description: string;
  priority: '' | ProjectTaskPriority;
};

type TaskViewMode = 'list' | 'timeline';

const TASK_PAGE_SIZE = 50;

const PRIORITY_OPTIONS: ProjectTaskPriority[] = ['low', 'normal', 'high', 'urgent'];
const STATUS_OPTIONS: ProjectTaskStatus[] = ['todo', 'in_progress', 'review', 'blocked', 'done'];

function statusOptionLabel(s: ProjectTaskStatus): string {
  return String(s)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function taskRowToDraft(t: ProjectTask): TaskDraft {
  const p = t.priority;
  const priority: TaskDraft['priority'] =
    p === 'low' || p === 'normal' || p === 'high' || p === 'urgent' ? p : '';
  return {
    title: t.title,
    status: (t.status ?? 'todo') as ProjectTaskStatus,
    due_on: t.due_on?.slice(0, 10) ?? '',
    assigned_to_user_id: t.assigned_to_user_id != null ? Number(t.assigned_to_user_id) : null,
    description: t.description != null ? String(t.description) : '',
    priority,
  };
}

interface ProjectTasksCardProps {
  tasks: ProjectTask[];
  taskDeps: ProjectTaskDependency[];
  tasksLoading: boolean;
  tasksLoadingMore: boolean;
  hasMoreTasks: boolean;
  taskError: string | null;
  taskView: TaskViewMode;
  onSetTaskView: (v: TaskViewMode) => void;
  drafts: Record<number, TaskDraft>;
  setDrafts: Dispatch<SetStateAction<Record<number, TaskDraft>>>;
  // Quick-add form
  newTitle: string;
  onNewTitleChange: (v: string) => void;
  newDescription: string;
  onNewDescriptionChange: (v: string) => void;
  newPriority: '' | ProjectTaskPriority;
  onNewPriorityChange: (v: '' | ProjectTaskPriority) => void;
  newDueOn: string;
  onNewDueOnChange: (v: string) => void;
  newAssigneeUserId: string;
  onNewAssigneeUserIdChange: (v: string) => void;
  creating: boolean;
  onCreateTaskSubmit: (e: FormEvent) => void;
  // List filters
  listStatusFilter: '' | ProjectTaskStatus;
  onListStatusFilterChange: (v: '' | ProjectTaskStatus) => void;
  listTitleQuery: string;
  onListTitleQueryChange: (v: string) => void;
  debouncedTitleQuery: string;
  listFiltersActive: boolean;
  // Actions
  onSaveTask: (id: number) => void;
  onDeleteTask: (id: number) => void;
  onLoadMoreTasks: () => void;
  onExportTimelineCsv: () => void;
  activeTeamMembers: TeamMembership[];
}

export function ProjectTasksCard({
  tasks,
  taskDeps,
  tasksLoading,
  tasksLoadingMore,
  hasMoreTasks,
  taskError,
  taskView,
  onSetTaskView,
  drafts,
  setDrafts,
  newTitle,
  onNewTitleChange,
  newDescription,
  onNewDescriptionChange,
  newPriority,
  onNewPriorityChange,
  newDueOn,
  onNewDueOnChange,
  newAssigneeUserId,
  onNewAssigneeUserIdChange,
  creating,
  onCreateTaskSubmit,
  listStatusFilter,
  onListStatusFilterChange,
  listTitleQuery,
  onListTitleQueryChange,
  debouncedTitleQuery,
  listFiltersActive,
  onSaveTask,
  onDeleteTask,
  onLoadMoreTasks,
  onExportTimelineCsv,
  activeTeamMembers,
}: ProjectTasksCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tasks</h2>
        <div
          className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5"
          role="group"
          aria-label="Task view"
        >
          <button
            type="button"
            onClick={() => onSetTaskView('list')}
            aria-pressed={taskView === 'list'}
            className={`rounded-md px-3 py-2.5 text-xs font-medium min-h-10 ${
              taskView === 'list'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            List
          </button>
          <button
            type="button"
            onClick={() => onSetTaskView('timeline')}
            aria-pressed={taskView === 'timeline'}
            className={`rounded-md px-3 py-2.5 text-xs font-medium min-h-10 ${
              taskView === 'timeline'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>
      {taskError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {taskError}
        </p>
      )}

      <form onSubmit={onCreateTaskSubmit} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <AppLabledInput
            id="new-task-title-d"
            label="New task title"
            type="text"
            value={newTitle}
            onChange={(e) => onNewTitleChange(e.target.value)}
            placeholder="Title *"
            autoComplete="off"
            className="min-w-[200px]"
          />
          <AppLabeledAreaInput
            label="Description (optional)"
            value={newDescription}
            onChange={(e) => onNewDescriptionChange(e.target.value)}
            rows={2}
            placeholder="Notes…"
            className="flex-1 min-w-[12rem] max-w-xl"
            textareaClassName="resize-y"
          />
          <AppLabledSelectInput
            id="new-task-priority-d"
            label="Priority"
            value={newPriority}
            onChange={(e) => onNewPriorityChange(e.target.value as '' | ProjectTaskPriority)}
            options={[
              { value: '', label: '—' },
              ...PRIORITY_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
            ]}
            className="min-w-[8rem]"
          />
          <AppLabledInput
            id="new-task-due-d"
            label="Due (optional)"
            type="date"
            value={newDueOn}
            onChange={(e) => onNewDueOnChange(e.target.value)}
          />
          <AppLabledSelectInput
            id="new-task-assignee-d"
            label="Assignee (optional)"
            value={newAssigneeUserId}
            onChange={(e) => onNewAssigneeUserIdChange(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...activeTeamMembers.map((m) => ({ value: String(m.user_id), label: `User #${m.user_id} (${m.role_key})` })),
            ]}
            className="min-w-[10rem]"
          />
          <button
            type="submit"
            disabled={creating}
            className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </form>

      {tasks.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Tasks load in pages of {TASK_PAGE_SIZE} (by position). Status and title filters are applied on the server
          (title search is debounced; see docs/03-database/project-tasks-select-filters.md). Board and Timeline use
          every task loaded so far — use Load more if needed. Assignees must be active team members for this
          business.
        </p>
      )}

      {tasksLoading ? (
        <p className="text-sm text-slate-500">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {listStatusFilter !== '' || debouncedTitleQuery ? (
            <>
              No tasks match the current filters.{' '}
              {listFiltersActive && (
                <button
                  type="button"
                  onClick={() => {
                    onListStatusFilterChange('');
                    onListTitleQueryChange('');
                  }}
                  className="text-indigo-600 dark:text-indigo-400 underline"
                >
                  Clear filters
                </button>
              )}
            </>
          ) : (
            'No tasks yet.'
          )}
        </p>
      ) : taskView === 'timeline' ? (
        <ProjectTasksTimeline
          tasks={tasks}
          dependencies={taskDeps}
          showGanttBars
          onExportCsv={onExportTimelineCsv}
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/30 p-3">
            <AppLabledSelectInput
              id="task-list-status-filter"
              label="Status"
              value={listStatusFilter}
              onChange={(e) =>
                onListStatusFilterChange((e.target.value === '' ? '' : e.target.value) as '' | ProjectTaskStatus)
              }
              options={[
                { value: '', label: 'All statuses' },
                ...STATUS_OPTIONS.map((s) => ({ value: s, label: statusOptionLabel(s) })),
              ]}
              className="min-w-[10rem]"
            />
            <div className="flex flex-col gap-1 flex-1 min-w-[12rem] max-w-md">
              <AppLabledInput
                id="task-list-title-search"
                label="Search title"
                type="text"
                value={listTitleQuery}
                onChange={(e) => onListTitleQueryChange(e.target.value)}
                placeholder="Filter by title…"
                autoComplete="off"
              />
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                Title search is sent to the server (debounced) using an <code className="text-xs">ilike</code> filter.
              </p>
            </div>
            {listFiltersActive && (
              <button
                type="button"
                onClick={() => {
                  onListStatusFilterChange('');
                  onListTitleQueryChange('');
                }}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
              >
                Clear filters
              </button>
            )}
          </div>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="min-w-full text-left text-sm border-collapse">
              <caption className="sr-only">
                Project tasks: edit fields and press Save. Fetched in pages of {TASK_PAGE_SIZE} by position. Showing{' '}
                {tasks.length} loaded tasks
                {listFiltersActive ? ' (filters applied on server)' : ''}.
              </caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">Title</th>
                  <th scope="col" className="py-2 pr-3 font-medium max-w-[14rem]">Description</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Priority</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Due</th>
                  <th scope="col" className="py-2 pr-3 font-medium">Assignee</th>
                  <th scope="col" className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  if (t.id == null) return null;
                  const d: TaskDraft = drafts[t.id] ?? taskRowToDraft(t);
                  const assigneeSelectId = `task-${t.id}-assignee`;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 align-top">
                      <td className="py-2 pr-3">
                        <AppLabledInput
                          id={`task-${t.id}-title`}
                          label={`Title for task ${t.id}`}
                          labelHidden
                          type="text"
                          value={d.title}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [t.id!]: { ...d, title: e.target.value } }))
                          }
                          className="w-full max-w-xs"
                        />
                      </td>
                      <td className="py-2 pr-3 max-w-[14rem]">
                        <AppLabeledAreaInput
                          label={`Description for task ${t.id}`}
                          labelHidden
                          rows={2}
                          value={d.description}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [t.id!]: { ...d, description: e.target.value } }))
                          }
                          textareaClassName="resize-y"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <AppLabledSelectInput
                          id={`task-${t.id}-priority`}
                          label={`Priority for task ${t.id}`}
                          labelHidden
                          value={d.priority}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, priority: e.target.value as TaskDraft['priority'] },
                            }))
                          }
                          options={[
                            { value: '', label: '—' },
                            ...PRIORITY_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) })),
                          ]}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <AppLabledSelectInput
                          id={`task-${t.id}-status`}
                          label={`Status for task ${t.id}`}
                          labelHidden
                          value={d.status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, status: e.target.value as ProjectTaskStatus },
                            }))
                          }
                          options={STATUS_OPTIONS.map((s) => ({ value: s, label: statusOptionLabel(s) }))}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <AppLabledInput
                          id={`task-${t.id}-due`}
                          label={`Due date for task ${t.id}`}
                          labelHidden
                          type="date"
                          value={d.due_on}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [t.id!]: { ...d, due_on: e.target.value } }))
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <AppLabledSelectInput
                          id={assigneeSelectId}
                          label={`Assignee for task ${t.id}`}
                          labelHidden
                          value={d.assigned_to_user_id != null ? String(d.assigned_to_user_id) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, assigned_to_user_id: v === '' ? null : Number(v) },
                            }));
                          }}
                          options={[
                            { value: '', label: 'Unassigned' },
                            ...activeTeamMembers.map((m) => ({ value: String(m.user_id), label: `User #${m.user_id} (${m.role_key})` })),
                          ]}
                          className="max-w-[12rem]"
                        />
                      </td>
                      <td className="py-2 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => onSaveTask(t.id!)}
                          className="min-h-10 rounded border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(t.id!)}
                          className="min-h-10 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMoreTasks && (
            <button
              type="button"
              disabled={tasksLoadingMore}
              onClick={onLoadMoreTasks}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {tasksLoadingMore ? 'Loading…' : `Load more (${tasks.length} loaded)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
