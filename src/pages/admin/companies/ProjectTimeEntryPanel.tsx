import type { FormEvent } from 'react';
import type { Project } from '@/types/project';
import type { ProjectTask } from '@/types/task';
import type { ProjectTimeEntry } from '@/types/timeEntry';
import AppLabledInput from '@/components/forms/AppLabledInput';
import AppLabledSelectInput from '@/components/forms/AppLabledSelectInput';

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ProjectTimeEntryPanelProps {
  project: Project;
  tasks: ProjectTask[];
  // Budget
  budgetHoursInput: string;
  onBudgetHoursChange: (v: string) => void;
  budgetAmountInput: string;
  onBudgetAmountChange: (v: string) => void;
  budgetSaving: boolean;
  onSaveBudgets: () => void;
  billableMinutesForBudget: number;
  billableRollup: { totalMinutes: number; entryCount: number; capped: boolean } | null;
  billableRollupLoading: boolean;
  // Time entry summary
  timeEntries: ProjectTimeEntry[];
  hasMoreTimeEntries: boolean;
  loggedTotalMinutes: number;
  loggedBillableMinutes: number;
  timeEntriesLoading: boolean;
  timeEntriesLoadingMore: boolean;
  onLoadMoreTimeEntries: () => void;
  // Timer
  workTimerStartedAt: number | null;
  workTimerTick: number;
  timerBillable: boolean;
  onTimerBillableChange: (v: boolean) => void;
  timerSaving: boolean;
  onTimerStart: () => void;
  onTimerStop: () => void;
  onTimerDiscard: () => void;
  // Log time form
  logMinutes: string;
  onLogMinutesChange: (v: string) => void;
  logTaskId: string;
  onLogTaskIdChange: (v: string) => void;
  logBillable: boolean;
  onLogBillableChange: (v: boolean) => void;
  logNotes: string;
  onLogNotesChange: (v: string) => void;
  logSaving: boolean;
  onLogTimeSubmit: (e: FormEvent) => void;
}

export function ProjectTimeEntryPanel({
  project,
  tasks,
  budgetHoursInput,
  onBudgetHoursChange,
  budgetAmountInput,
  onBudgetAmountChange,
  budgetSaving,
  onSaveBudgets,
  billableMinutesForBudget,
  billableRollup,
  billableRollupLoading,
  timeEntries,
  hasMoreTimeEntries,
  loggedTotalMinutes,
  loggedBillableMinutes,
  timeEntriesLoading,
  timeEntriesLoadingMore,
  onLoadMoreTimeEntries,
  workTimerStartedAt,
  workTimerTick,
  timerBillable,
  onTimerBillableChange,
  timerSaving,
  onTimerStart,
  onTimerStop,
  onTimerDiscard,
  logMinutes,
  onLogMinutesChange,
  logTaskId,
  onLogTaskIdChange,
  logBillable,
  onLogBillableChange,
  logNotes,
  onLogNotesChange,
  logSaving,
  onLogTimeSubmit,
}: ProjectTimeEntryPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Budget and time</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Planned caps for this project (optional). Billable time logged below counts toward burn when budget
            hours are set.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <AppLabledInput
              id="project-budget-hours"
              label="Budget hours"
              type="text"
              value={budgetHoursInput}
              onChange={(e) => onBudgetHoursChange(e.target.value)}
              placeholder="e.g. 40"
              className="w-32"
            />
            <AppLabledInput
              id="project-budget-amount"
              label="Budget amount"
              type="text"
              value={budgetAmountInput}
              onChange={(e) => onBudgetAmountChange(e.target.value)}
              placeholder="Same currency as invoices"
              className="min-w-[10rem] max-w-xs"
            />
            <button
              type="button"
              disabled={budgetSaving}
              onClick={onSaveBudgets}
              className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {budgetSaving ? 'Saving…' : 'Save budgets'}
            </button>
          </div>
          {project.budget_hours != null &&
            Number.isFinite(Number(project.budget_hours)) &&
            Number(project.budget_hours) > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Billable vs budget</span>
              {billableRollupLoading ? ' (loading full rollup…)' : null}
              {!billableRollupLoading && billableRollup?.capped ? ' (capped rollup)' : null}:{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {(billableMinutesForBudget / 60).toFixed(1)} h
              </span>{' '}
              of {Number(project.budget_hours)} h budget
              {billableMinutesForBudget / 60 > Number(project.budget_hours) ? (
                <span className="text-amber-700 dark:text-amber-300">
                  {' '}
                  (over budget
                  {billableRollup != null && !billableRollupLoading && !billableRollup.capped ? '' : ' — may be incomplete'}
                  )
                </span>
              ) : null}
            </p>
          )}
        </div>
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-4">
          <p>
            Logged ({timeEntries.length}{' '}
            {timeEntries.length === 1 ? 'entry' : 'entries'} in memory{hasMoreTimeEntries ? ', not all loaded' : ''}
            ):{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {(loggedTotalMinutes / 60).toFixed(1)} h
            </span>{' '}
            total,{' '}
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {(loggedBillableMinutes / 60).toFixed(1)} h
            </span>{' '}
            billable.
          </p>
          {billableRollupLoading && (
            <p data-testid="billable-rollup-loading" className="text-slate-500 dark:text-slate-500">
              Full billable rollup: loading…
            </p>
          )}
          {!billableRollupLoading && billableRollup != null && (
            <p data-testid="billable-rollup-summary" className="text-slate-600 dark:text-slate-400">
              Full billable rollup (same scan as invoice billable line):{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {(billableRollup.totalMinutes / 60).toFixed(1)} h
              </span>{' '}
              from {billableRollup.entryCount} billable row{billableRollup.entryCount === 1 ? '' : 's'}
              {billableRollup.capped ? ' — scan hit safety cap; total may be low.' : '.'}
            </p>
          )}
          {!billableRollupLoading && billableRollup == null && (
            <p data-testid="billable-rollup-unavailable" className="text-amber-800/90 dark:text-amber-200/80">
              Full billable rollup unavailable; budget line above falls back to loaded entries only.
            </p>
          )}
          {timeEntriesLoading && <p className="text-slate-500">Loading time entries…</p>}
          {timeEntriesLoadingMore && (
            <p className="text-slate-500">Loading older time entries…</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Timer</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Runs in this browser; survives refresh. Stop saves one entry (duration rounded up to whole minutes, max
          24h per entry).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-lg font-mono tabular-nums text-slate-800 dark:text-slate-100 min-w-[5rem]">
            {workTimerStartedAt != null
              ? formatElapsed(Math.max(0, Math.floor((workTimerTick - workTimerStartedAt) / 1000)))
              : '—'}
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={timerBillable}
              onChange={(e) => onTimerBillableChange(e.target.checked)}
              disabled={workTimerStartedAt != null}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Billable
          </label>
          {workTimerStartedAt == null ? (
            <button
              type="button"
              onClick={onTimerStart}
              className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Start timer
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={timerSaving}
                onClick={onTimerStop}
                className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {timerSaving ? 'Saving…' : 'Stop & log'}
              </button>
              <button
                type="button"
                disabled={timerSaving}
                onClick={onTimerDiscard}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Discard
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={onLogTimeSubmit} className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          Log time
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <AppLabledInput
            id="log-duration-minutes"
            label="Minutes"
            type="number"
            min={1}
            max={1440}
            value={logMinutes}
            onChange={(e) => onLogMinutesChange(e.target.value)}
            required
            className="w-24"
          />
          <AppLabledSelectInput
            id="log-task-id"
            label="Task (optional)"
            value={logTaskId}
            onChange={(e) => onLogTaskIdChange(e.target.value)}
            options={[
              { value: '', label: 'Project only' },
              ...tasks
                .filter((t) => t.id != null)
                .map((t) => ({ value: String(t.id), label: t.title })),
            ]}
            className="min-w-[10rem] max-w-xs"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pb-2">
            <input
              type="checkbox"
              checked={logBillable}
              onChange={(e) => onLogBillableChange(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600"
            />
            Billable
          </label>
          <AppLabledInput
            id="log-notes"
            label="Notes (optional)"
            type="text"
            value={logNotes}
            onChange={(e) => onLogNotesChange(e.target.value)}
            className="flex-1 min-w-[12rem] max-w-md"
          />
          <button
            type="submit"
            disabled={logSaving}
            className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {logSaving ? 'Saving…' : 'Log time'}
          </button>
        </div>
      </form>

      {timeEntries.length > 0 && (
        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-700 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
            Recent entries
          </h3>
          <table className="min-w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-2 pr-3 font-medium">When</th>
                <th scope="col" className="py-2 pr-3 font-medium">Minutes</th>
                <th scope="col" className="py-2 pr-3 font-medium">Billable</th>
                <th scope="col" className="py-2 pr-3 font-medium">Task</th>
                <th scope="col" className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {timeEntries.map((row) => (
                <tr key={row.id ?? `${row.logged_at}-${row.duration_minutes}`} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-2 pr-3 whitespace-nowrap">{row.logged_at?.slice(0, 16) ?? '—'}</td>
                  <td className="py-2 pr-3">{row.duration_minutes}</td>
                  <td className="py-2 pr-3">{row.billable ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-3">
                    {row.task_id != null
                      ? tasks.find((t) => t.id === row.task_id)?.title ?? `#${row.task_id}`
                      : '—'}
                  </td>
                  <td className="py-2 max-w-[14rem] truncate">{row.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMoreTimeEntries && (
            <div className="mt-3">
              <button
                type="button"
                disabled={timeEntriesLoadingMore}
                onClick={onLoadMoreTimeEntries}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {timeEntriesLoadingMore ? 'Loading…' : 'Load more time entries'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
