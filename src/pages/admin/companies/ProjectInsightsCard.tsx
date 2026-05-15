import { useMemo } from 'react';
import type { Project } from '@/types/project';
import type { ProjectTask } from '@/types/task';
import type { ProjectTimeEntry } from '@/types/timeEntry';
import { localDateISO } from '@/utils/localDateISO';

function isOpenTask(status: string | undefined): boolean {
  return String(status ?? 'todo') !== 'done';
}

/**
 * Read-only metrics from **already loaded** tasks and time entries (Phase 9a slice).
 * Does not query extra pages — see `docs/02-modules/project-insights-analytics.md`.
 */
export function ProjectInsightsCard({
  tasks,
  timeEntries,
  project,
  onExportTasksCsv,
  onExportTimeEntriesCsv,
}: {
  tasks: ProjectTask[];
  timeEntries: ProjectTimeEntry[];
  project: Project;
  /** Phase 9b: export rows currently loaded in the SPA (not a full server dump). */
  onExportTasksCsv?: () => void;
  onExportTimeEntriesCsv?: () => void;
}) {
  const todayIso = localDateISO();

  const withId = useMemo(() => tasks.filter((t) => t.id != null), [tasks]);
  const canExportTasks = withId.length > 0 && onExportTasksCsv != null;
  const canExportTime = timeEntries.length > 0 && onExportTimeEntriesCsv != null;

  const statusCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of withId) {
      const s = String(t.status ?? 'todo');
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [withId]);

  const overdueOpen = useMemo(
    () =>
      withId.filter((t) => {
        const d = t.due_on?.slice(0, 10) ?? '';
        if (d.length !== 10) return false;
        return d < todayIso && isOpenTask(t.status);
      }).length,
    [withId, todayIso]
  );

  const billableMinutes = useMemo(
    () =>
      timeEntries.reduce((s, e) => {
        if (!e.billable) return s;
        const n = Number(e.duration_minutes);
        return s + (Number.isFinite(n) ? n : 0);
      }, 0),
    [timeEntries]
  );

  const totalMinutes = useMemo(
    () =>
      timeEntries.reduce((s, e) => {
        const n = Number(e.duration_minutes);
        return s + (Number.isFinite(n) ? n : 0);
      }, 0),
    [timeEntries]
  );

  const budgetHours =
    project.budget_hours != null && Number.isFinite(Number(project.budget_hours)) ? Number(project.budget_hours) : null;

  const burnPct =
    budgetHours != null && budgetHours > 0 ? Math.min(100, (billableMinutes / 60 / budgetHours) * 100) : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Insights</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(canExportTasks || canExportTime) && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Export loaded data">
              {canExportTasks && (
                <button
                  type="button"
                  onClick={onExportTasksCsv}
                  className="min-h-8 rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Export tasks (CSV)
                </button>
              )}
              {canExportTime && (
                <button
                  type="button"
                  onClick={onExportTimeEntriesCsv}
                  className="min-h-8 rounded-md border border-slate-200 dark:border-slate-600 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Export time (CSV)
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-wide">Loaded data only</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Tasks loaded</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{withId.length}</dd>
        </div>
        <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2">
          <dt className="text-xs text-amber-800 dark:text-amber-200/90">Overdue (open)</dt>
          <dd className="text-lg font-semibold text-amber-900 dark:text-amber-100">{overdueOpen}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Billable (window)</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{(billableMinutes / 60).toFixed(1)} h</dd>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 px-3 py-2">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Logged total</dt>
          <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{(totalMinutes / 60).toFixed(1)} h</dd>
        </div>
      </dl>
      {burnPct != null && (
        <div>
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
            <span>Budget burn (billable vs budget hours)</span>
            <span className="font-medium">{burnPct.toFixed(0)}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(burnPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Budget burn percentage"
          >
            <div
              className={`h-full rounded-full transition-all ${
                burnPct >= 100 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${burnPct}%` }}
            />
          </div>
        </div>
      )}
      {statusCounts.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">By status (loaded)</h3>
          <ul className="flex flex-wrap gap-2 text-xs">
            {statusCounts.map(([status, n]) => (
              <li
                key={status}
                className="rounded-md border border-slate-200 dark:border-slate-600 px-2 py-1 text-slate-700 dark:text-slate-200"
              >
                <span className="font-medium">{status}</span> {n}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-500">
        CSV export covers <strong className="font-normal">loaded</strong> rows only — use Load more on tasks and time
        first for a fuller file. Cross-project dashboards:{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">docs/plans/project-task-management/phase-09-analytics.md</code>.
      </p>
    </div>
  );
}
