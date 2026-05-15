import { useMemo } from 'react';
import type { ProjectTask, ProjectTaskStatus } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import { localDateISO } from '@/utils/localDateISO';
import { blockedByLabelBySuccessorId } from '@/utils/projectTaskBlockedBy';

function formatStatusLabel(s: ProjectTaskStatus | string | undefined): string {
  return String(s ?? 'todo')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function monthHeading(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function sortTasksForTimeline(a: ProjectTask, b: ProjectTask): number {
  const da = a.due_on?.slice(0, 10) ?? '';
  const db = b.due_on?.slice(0, 10) ?? '';
  if (!da && !db) return (Number(a.position) || 0) - (Number(b.position) || 0);
  if (!da) return 1;
  if (!db) return -1;
  const c = da.localeCompare(db);
  if (c !== 0) return c;
  return (Number(a.position) || 0) - (Number(b.position) || 0);
}

function isOpenTask(status: ProjectTaskStatus | string | undefined): boolean {
  return String(status ?? 'todo') !== 'done';
}

/** Day-of-month marker within the due date's month (Phase 8e Gantt slice). */
function GanttMonthMarker({ dueIso }: { dueIso: string }) {
  const [y, m, d] = dueIso.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const daysInMonth = new Date(y, m, 0).getDate();
  const pct = Math.min(100, Math.max(6, (d / daysInMonth) * 100));
  return (
    <div
      className="w-full max-w-[10rem] h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1.5"
      title={`Due day ${d} of ${daysInMonth}`}
      aria-hidden
    >
      <div className="h-full rounded-full bg-indigo-500/80 dark:bg-indigo-400/80" style={{ width: `${pct}%` }} />
    </div>
  );
}

export interface ProjectTasksTimelineProps {
  tasks: ProjectTask[];
  /** Optional predecessor edges (`project_task_dependencies`). */
  dependencies?: ProjectTaskDependency[];
  /** Shorter copy for public portal view. */
  portalMode?: boolean;
  /** Show month Gantt markers on dated rows. */
  showGanttBars?: boolean;
  /** Export loaded timeline rows as CSV (Phase 8e). */
  onExportCsv?: () => void;
}

/**
 * Read-only timeline of loaded tasks by `due_on` (Phase 8 / Gantt slice).
 * Editing stays on List view.
 */
export function ProjectTasksTimeline({
  tasks,
  dependencies,
  portalMode,
  showGanttBars = false,
  onExportCsv,
}: ProjectTasksTimelineProps) {
  const todayIso = localDateISO();

  const titleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tasks) {
      if (t.id != null) m.set(t.id, t.title || `Task #${t.id}`);
    }
    return m;
  }, [tasks]);

  const afterLabelBySuccessorId = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of dependencies ?? []) {
      const predTitle = titleById.get(d.predecessor_task_id) ?? `#${d.predecessor_task_id}`;
      const cur = m.get(d.successor_task_id);
      m.set(d.successor_task_id, cur ? `${cur}, ${predTitle}` : predTitle);
    }
    return m;
  }, [dependencies, titleById]);

  const blockedBySuccessorId = useMemo(
    () => blockedByLabelBySuccessorId(tasks, dependencies),
    [tasks, dependencies]
  );

  const { dated, overdue, unscheduled } = useMemo(() => {
    const withId = tasks.filter((t) => t.id != null);
    const sorted = [...withId].sort(sortTasksForTimeline);
    const unsched: ProjectTask[] = [];
    const sched: ProjectTask[] = [];
    for (const t of sorted) {
      const d = t.due_on?.slice(0, 10) ?? '';
      if (d.length === 10) sched.push(t);
      else unsched.push(t);
    }
    const overdueList: ProjectTask[] = [];
    const datedList: ProjectTask[] = [];
    for (const t of sched) {
      const due = t.due_on!.slice(0, 10);
      if (due < todayIso && isOpenTask(t.status)) overdueList.push(t);
      else datedList.push(t);
    }
    return { dated: datedList, overdue: overdueList, unscheduled: unsched };
  }, [tasks, todayIso]);

  const renderTaskRow = (t: ProjectTask, opts: { tone: 'default' | 'overdue' }) => {
    const due = t.due_on!.slice(0, 10);
    const isToday = due === todayIso;
    const tone = opts.tone;
    const after = t.id != null ? afterLabelBySuccessorId.get(t.id) : undefined;
    const blocked = t.id != null ? blockedBySuccessorId.get(t.id) : undefined;
    return (
      <div
        className={`flex flex-wrap gap-3 px-3 py-2.5 items-start ${
          tone === 'overdue'
            ? 'bg-amber-50/90 dark:bg-amber-950/25'
            : 'bg-white dark:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2 shrink-0 w-[6.5rem] sm:w-auto sm:min-w-[7rem]">
          <time dateTime={due} className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {due}
          </time>
          {isToday && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Today
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{t.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatStatusLabel(t.status as ProjectTaskStatus | undefined)}
            {t.assigned_to_user_id != null ? ` · Assignee #${t.assigned_to_user_id}` : ' · Unassigned'}
          </p>
          {after && (
            <p className="text-xs text-indigo-700/90 dark:text-indigo-300/90 mt-1">
              After: <span className="font-medium">{after}</span>
            </p>
          )}
          {blocked && (
            <p className="text-xs text-rose-700/90 dark:text-rose-300/90 mt-1">
              Blocked by: <span className="font-medium">{blocked}</span>
            </p>
          )}
          {showGanttBars && <GanttMonthMarker dueIso={due} />}
        </div>
      </div>
    );
  };

  const renderDatedWithMonths = () => (
    <div className="space-y-0 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
      {dated.map((t, idx) => {
        const due = t.due_on!.slice(0, 10);
        const ym = due.slice(0, 7);
        const prev = idx > 0 ? dated[idx - 1] : null;
        const showMonth = idx === 0 || (prev != null && prev.due_on!.slice(0, 7) !== ym);
        return (
          <div key={t.id}>
            {showMonth && (
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900/50 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {monthHeading(ym)}
              </div>
            )}
            {renderTaskRow(t, { tone: 'default' })}
          </div>
        );
      })}
    </div>
  );

  const hasAnyDated = dated.length > 0 || overdue.length > 0;
  const withIdCount = tasks.filter((t) => t.id != null).length;
  const hasDeps = (dependencies?.length ?? 0) > 0;

  const canExport = onExportCsv != null && withIdCount > 0;

  return (
    <div className="space-y-6" aria-label="Task timeline by due date">
      {canExport && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onExportCsv}
            className="min-h-8 rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Export timeline (CSV)
          </button>
        </div>
      )}
      {!portalMode && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Read-only schedule from{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">due dates</span> on tasks already loaded
          (same pages as Board). Switch to <span className="font-medium text-slate-700 dark:text-slate-300">List</span>{' '}
          to edit. Open tasks past due appear under{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">Overdue</span>.
          {hasDeps
            ? ' Dependencies appear as “After …” when configured on this project.'
            : ' Add dependencies on the project detail page to see “After …” hints.'}{' '}
          See docs/02-modules/project-phase8-portal-gantt-automation.md.
        </p>
      )}
      {portalMode && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Due dates for tasks shared with this link. Open tasks past due appear under Overdue.
          {hasDeps && ' Dependencies show as “After …” when configured.'}
        </p>
      )}

      {unscheduled.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
            Unscheduled ({unscheduled.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {unscheduled.map((t) => {
              const after = t.id != null ? afterLabelBySuccessorId.get(t.id) : undefined;
              return (
                <li
                  key={t.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm max-w-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">{t.title}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatStatusLabel(t.status as ProjectTaskStatus | undefined)}
                  </span>
                  {after && (
                    <span className="text-xs text-indigo-700 dark:text-indigo-300 block mt-1">After: {after}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {overdue.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/90 mb-2">
            Overdue ({overdue.length})
          </h3>
          <div className="space-y-0 border border-amber-200/80 dark:border-amber-900/50 rounded-lg overflow-hidden divide-y divide-amber-100 dark:divide-amber-900/40">
            {overdue.map((t) => (
              <div key={t.id}>{renderTaskRow(t, { tone: 'overdue' })}</div>
            ))}
          </div>
        </div>
      )}

      {withIdCount === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No tasks in the loaded set.</p>
      ) : !hasAnyDated && unscheduled.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No tasks with due dates in the loaded set.</p>
      ) : dated.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-3">
            By due date
          </h3>
          {renderDatedWithMonths()}
        </div>
      ) : overdue.length > 0 ? null : null}
    </div>
  );
}
