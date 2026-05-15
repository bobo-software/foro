import { useMemo } from 'react';
import type { ProjectTask, ProjectTaskStatus } from '@/types/task';

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

/** Local calendar date `YYYY-MM-DD` (not UTC) for comparing with `due_on` date strings. */
function localDateISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export interface ProjectTasksTimelineProps {
  tasks: ProjectTask[];
}

/**
 * Read-only timeline of loaded tasks by `due_on` (Phase 8 / Gantt slice).
 * Editing stays on List view.
 */
export function ProjectTasksTimeline({ tasks }: ProjectTasksTimelineProps) {
  const todayIso = localDateISO();

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
    return (
      <div
        key={t.id}
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

  return (
    <div className="space-y-6" aria-label="Task timeline by due date">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Read-only schedule from{' '}
        <span className="font-medium text-slate-700 dark:text-slate-300">due dates</span> on tasks already loaded
        (same pages as Board). Switch to <span className="font-medium text-slate-700 dark:text-slate-300">List</span>{' '}
        to edit. Open tasks past due appear under <span className="font-medium text-slate-700 dark:text-slate-300">Overdue</span>.
        No dependencies or critical path yet — see docs/02-modules/project-phase8-portal-gantt-automation.md.
      </p>

      {unscheduled.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
            Unscheduled ({unscheduled.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <li
                key={t.id}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-sm max-w-xs"
              >
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate block">{t.title}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatStatusLabel(t.status as ProjectTaskStatus | undefined)}
                </span>
              </li>
            ))}
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
