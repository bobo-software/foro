import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppPageHeader } from '@/components/ComponentsIndex';
import CompanyService from '@/services/companyService';
import ProjectService from '@/services/projectService';
import TaskService from '@/services/taskService';
import TimeEntryService from '@/services/timeEntryService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Project } from '@/types/project';
import type { ProjectTask } from '@/types/task';
import {
  aggregateTasksByProjectId,
  buildProjectOverviewRows,
  sumRollups,
  type ProjectOverviewRow,
} from '@/utils/projectOverviewMetrics';
import { buildCsvLines, downloadCsvFile } from '@/utils/csvDownload';

const PROJECT_LIST_LIMIT = 500;
const TASK_PAGE_SIZE = 500;
const MAX_TASK_PAGES = 6;

async function loadTasksForBusiness(businessId: number): Promise<{ tasks: ProjectTask[]; capped: boolean }> {
  const tasks: ProjectTask[] = [];
  let offset = 0;
  let capped = false;
  for (let page = 0; page < MAX_TASK_PAGES; page++) {
    const rows = await TaskService.findAll({
      where: { business_id: businessId },
      orderBy: 'project_id',
      orderDirection: 'ASC',
      limit: TASK_PAGE_SIZE,
      offset,
    });
    tasks.push(...rows);
    if (rows.length < TASK_PAGE_SIZE) break;
    offset += rows.length;
    if (page === MAX_TASK_PAGES - 1) capped = true;
  }
  return { tasks, capped };
}

type SortKey = 'name' | 'overdue' | 'open' | 'company';

export function ProjectsOverviewPage() {
  const navigate = useNavigate();
  const bid = useBusinessStore((s) => s.currentBusiness?.id);
  const businessName = useBusinessStore((s) => s.currentBusiness?.name);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasksCapped, setTasksCapped] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companyNameById, setCompanyNameById] = useState<Map<number, string>>(new Map());
  const [taskRollups, setTaskRollups] = useState(() => new Map());
  const [billableByProjectId, setBillableByProjectId] = useState(
    () => new Map<number, { minutes: number; capped: boolean }>()
  );
  const [billableLoading, setBillableLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('overdue');
  const [sortDesc, setSortDesc] = useState(true);

  const loadOverview = useCallback(async () => {
    if (bid == null) return;
    setLoading(true);
    setError(null);
    setBillableByProjectId(new Map());
    try {
      const [projectRows, companyRows, taskResult] = await Promise.all([
        ProjectService.findAll({
          where: { business_id: bid },
          orderBy: 'name',
          orderDirection: 'ASC',
          limit: PROJECT_LIST_LIMIT,
        }),
        CompanyService.findAll({
          where: { business_id: bid },
          orderBy: 'name',
          orderDirection: 'ASC',
          limit: PROJECT_LIST_LIMIT,
        }),
        loadTasksForBusiness(bid),
      ]);
      const names = new Map<number, string>();
      for (const c of companyRows) {
        if (c.id != null) names.set(c.id, c.name || c.company_name || `Company #${c.id}`);
      }
      setCompanyNameById(names);
      setProjects(projectRows);
      setTaskRollups(aggregateTasksByProjectId(taskResult.tasks));
      setTasksCapped(taskResult.capped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load overview');
      setProjects([]);
      setTaskRollups(new Map());
    } finally {
      setLoading(false);
    }
  }, [bid]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (bid == null || projects.length === 0 || loading) return;
    let cancelled = false;
    setBillableLoading(true);
    (async () => {
      const next = new Map<number, { minutes: number; capped: boolean }>();
      for (const p of projects) {
        if (cancelled || p.id == null) continue;
        try {
          const r = await TimeEntryService.sumBillableMinutesForProject({
            project_id: p.id,
            business_id: bid,
          });
          next.set(p.id, { minutes: r.totalMinutes, capped: r.capped });
        } catch {
          /* skip row */
        }
      }
      if (!cancelled) setBillableByProjectId(next);
    })().finally(() => {
      if (!cancelled) setBillableLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bid, projects, loading]);

  const rows = useMemo(
    () =>
      buildProjectOverviewRows({
        projects,
        companyNameById,
        taskRollups,
        billableByProjectId,
      }),
    [projects, companyNameById, taskRollups, billableByProjectId]
  );

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    const dir = sortDesc ? -1 : 1;
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'overdue':
          return (a.rollup.overdueOpen - b.rollup.overdueOpen) * dir || a.project.name.localeCompare(b.project.name);
        case 'open':
          return (a.rollup.open - b.rollup.open) * dir || a.project.name.localeCompare(b.project.name);
        case 'company':
          return a.companyName.localeCompare(b.companyName) * dir || a.project.name.localeCompare(b.project.name);
        case 'name':
        default:
          return a.project.name.localeCompare(b.project.name) * dir;
      }
    });
    return copy;
  }, [rows, sortKey, sortDesc]);

  const totals = useMemo(() => sumRollups(rows), [rows]);

  const exportOverviewCsv = useCallback(() => {
    if (sortedRows.length === 0) return;
    const headers = [
      'project_id',
      'project',
      'company',
      'status',
      'tasks_in_scan',
      'open',
      'done',
      'overdue_open',
      'billable_hours',
      'budget_hours',
    ];
    const body = buildCsvLines(
      headers,
      sortedRows.map((r) => [
        r.project.id,
        r.project.name,
        r.companyName,
        r.project.status ?? '',
        r.rollup.total,
        r.rollup.open,
        r.rollup.done,
        r.rollup.overdueOpen,
        r.billableMinutes != null ? (r.billableMinutes / 60).toFixed(1) : '',
        r.project.budget_hours ?? '',
      ])
    );
    downloadCsvFile(`projects-overview-${bid ?? 'business'}.csv`, body);
  }, [sortedRows, bid]);

  if (bid == null) {
    return (
      <p className="text-amber-700 dark:text-amber-300">
        Select a business in the app header to see the projects overview.
      </p>
    );
  }

  if (loading) {
    return <p className="text-slate-500 dark:text-slate-400">Loading projects overview…</p>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="Projects overview"
        subtitle={businessName ? `${businessName} · cross-project health` : 'Cross-project health'}
        showBackButton
        backButtonText="Dashboard"
        onBackClick={() => navigate('/app/dashboard')}
      />

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Task counts come from up to {TASK_PAGE_SIZE * MAX_TASK_PAGES} tasks in this business
        {tasksCapped ? ' (scan capped — counts may be low).' : '.'} Billable hours use the same paged rollup as
        invoices per project{billableLoading ? ' (loading…)' : '.'}
      </p>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <SummaryTile label="Projects" value={rows.length} />
        <SummaryTile label="Tasks (scan)" value={totals.total} />
        <SummaryTile label="Open (scan)" value={totals.open} highlight={totals.overdueOpen > 0 ? 'amber' : undefined} />
        <SummaryTile label="Overdue (open)" value={totals.overdueOpen} highlight={totals.overdueOpen > 0 ? 'amber' : undefined} />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          Sort by
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
          >
            <option value="overdue">Overdue (open)</option>
            <option value="open">Open tasks</option>
            <option value="name">Project name</option>
            <option value="company">Company</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSortDesc((d) => !d)}
          className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
        >
          {sortDesc ? 'Descending' : 'Ascending'}
        </button>
        <button
          type="button"
          disabled={sortedRows.length === 0}
          onClick={exportOverviewCsv}
          className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
        >
          Export overview (CSV)
        </button>
      </div>

      {sortedRows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No projects in this business yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Projects overview for current business</caption>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                <th scope="col" className="py-3 px-3 font-medium">
                  Project
                </th>
                <th scope="col" className="py-3 px-3 font-medium">
                  Company
                </th>
                <th scope="col" className="py-3 px-3 font-medium text-right">
                  Tasks
                </th>
                <th scope="col" className="py-3 px-3 font-medium text-right">
                  Overdue
                </th>
                <th scope="col" className="py-3 px-3 font-medium text-right">
                  Billable
                </th>
                <th scope="col" className="py-3 px-3 font-medium text-right">
                  Budget
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <OverviewTableRow key={row.project.id} row={row} billableLoading={billableLoading} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'amber';
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        highlight === 'amber'
          ? 'bg-amber-50/80 dark:bg-amber-950/30'
          : 'bg-slate-50 dark:bg-slate-900/50'
      }`}
    >
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function OverviewTableRow({ row, billableLoading }: { row: ProjectOverviewRow; billableLoading: boolean }) {
  const p = row.project;
  const projectHref =
    p.id != null && Number.isFinite(p.company_id)
      ? `/app/companies/${p.company_id}/projects/${p.id}`
      : '#';
  const budgetHours =
    p.budget_hours != null && Number.isFinite(Number(p.budget_hours)) ? Number(p.budget_hours) : null;
  const billableH = row.billableMinutes != null ? row.billableMinutes / 60 : null;
  const overBudget =
    budgetHours != null && budgetHours > 0 && billableH != null && billableH > budgetHours;

  return (
    <tr className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
      <td className="py-2.5 px-3">
        <Link to={projectHref} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline no-underline">
          {p.name}
        </Link>
        {p.status && (
          <span className="block text-xs text-slate-500 dark:text-slate-400 capitalize">{String(p.status)}</span>
        )}
      </td>
      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{row.companyName}</td>
      <td className="py-2.5 px-3 text-right tabular-nums">
        {row.rollup.total}
        <span className="text-xs text-slate-500 dark:text-slate-400 block">
          {row.rollup.open} open · {row.rollup.done} done
        </span>
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums">
        {row.rollup.overdueOpen > 0 ? (
          <span className="text-amber-700 dark:text-amber-300 font-medium">{row.rollup.overdueOpen}</span>
        ) : (
          '0'
        )}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
        {billableLoading && row.billableMinutes == null ? (
          '…'
        ) : billableH != null ? (
          <span className={overBudget ? 'text-amber-700 dark:text-amber-300 font-medium' : undefined}>
            {billableH.toFixed(1)} h
            {row.billableCapped ? '*' : ''}
          </span>
        ) : (
          '—'
        )}
      </td>
      <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
        {budgetHours != null ? `${budgetHours} h` : '—'}
      </td>
    </tr>
  );
}
