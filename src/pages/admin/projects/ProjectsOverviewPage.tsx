import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFolderPlus } from 'react-icons/lu';
import { AppPageHeader } from '@/components/ComponentsIndex';
import { AppModal } from '@/components/modals/AppModal';
import CompanyService from '@/services/companyService';
import ProjectService from '@/services/projectService';
import TaskService from '@/services/taskService';
import TaskCategoryService from '@/services/taskCategoryService';
import TimeEntryService from '@/services/timeEntryService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Project, ProjectStatus } from '@/types/project';
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
  const [newProjectOpen, setNewProjectOpen] = useState(false);

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

  const companies = useMemo(
    () => Array.from(companyNameById.entries()).map(([id, name]) => ({ id, name })),
    [companyNameById]
  );

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
        title="Projects Overview"
        subtitle={businessName}
        showButton
        buttonText="New Project"
        buttonIcon={<LuFolderPlus size={14} />}
        onButtonClick={() => setNewProjectOpen(true)}
      />

      {newProjectOpen && (
        <NewProjectModal
          isOpen={newProjectOpen}
          onClose={() => setNewProjectOpen(false)}
          businessId={bid!}
          companies={companies}
          onCreated={(project) => {
            setNewProjectOpen(false);
            void loadOverview();
            if (project.id != null && project.company_id != null) {
              navigate(`/app/companies/${project.company_id}/projects/${project.id}`);
            }
          }}
        />
      )}

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

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  companies: { id: number; name: string }[];
  onCreated: (project: Project) => void;
}

function NewProjectModal({ isOpen, onClose, businessId, companies, onCreated }: NewProjectModalProps) {
  const nameId = useId();
  const codeId = useId();
  const companyId = useId();
  const statusId = useId();
  const startsId = useId();
  const endsId = useId();
  const budgetId = useId();
  const descId = useId();

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState({
    name: '',
    code: '',
    company_id: companies[0]?.id ?? 0,
    status: 'active' as ProjectStatus,
    starts_on: '',
    ends_on: '',
    budget_hours: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setSaving(false);
      setFields({
        name: '',
        code: '',
        company_id: companies[0]?.id ?? 0,
        status: 'active',
        starts_on: '',
        ends_on: '',
        budget_hours: '',
        description: '',
      });
    }
  }, [isOpen, companies]);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!fields.name.trim()) { setFormError('Project name is required.'); return; }
    if (!fields.company_id) { setFormError('Please select a company.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const project = await ProjectService.create({
        business_id: businessId,
        company_id: Number(fields.company_id),
        name: fields.name.trim(),
        code: fields.code.trim() || undefined,
        status: fields.status,
        starts_on: fields.starts_on || undefined,
        ends_on: fields.ends_on || undefined,
        budget_hours: fields.budget_hours !== '' ? Number(fields.budget_hours) : undefined,
        description: fields.description.trim() || undefined,
      });
      if (project.id != null) {
        void TaskCategoryService.seedDefaults(project.id, businessId);
      }
      onCreated(project);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create project.');
      setSaving(false);
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';
  const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

  return (
    <AppModal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      title="New Project"
      titleIcon={<LuFolderPlus size={16} />}
      size="lg"
      closeOnBackdrop={!saving}
      showCloseButton={!saving}
      buttons={[
        { label: 'Cancel', variant: 'secondary', onClick: onClose, disabled: saving },
        { label: 'Create Project', variant: 'primary', onClick: () => void handleSubmit(), loading: saving, loadingLabel: 'Creating…' },
      ]}
    >
      <div className="space-y-4 text-sm">
        {formError && (
          <p className="text-red-600 dark:text-red-400 text-xs">{formError}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor={nameId} className={labelCls}>Project name <span className="text-red-500">*</span></label>
            <input id={nameId} type="text" value={fields.name} onChange={set('name')} disabled={saving} placeholder="e.g. Website Redesign" className={inputCls} />
          </div>

          <div>
            <label htmlFor={companyId} className={labelCls}>Company <span className="text-red-500">*</span></label>
            <select id={companyId} value={fields.company_id} onChange={set('company_id')} disabled={saving} className={inputCls}>
              {companies.length === 0 && <option value="">No companies found</option>}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={statusId} className={labelCls}>Status</label>
            <select id={statusId} value={fields.status} onChange={set('status')} disabled={saving} className={inputCls}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor={codeId} className={labelCls}>Project code</label>
            <input id={codeId} type="text" value={fields.code} onChange={set('code')} disabled={saving} placeholder="e.g. PROJ-001" className={inputCls} />
          </div>

          <div>
            <label htmlFor={budgetId} className={labelCls}>Budget (hours)</label>
            <input id={budgetId} type="number" min="0" step="0.5" value={fields.budget_hours} onChange={set('budget_hours')} disabled={saving} placeholder="e.g. 40" className={inputCls} />
          </div>

          <div>
            <label htmlFor={startsId} className={labelCls}>Start date</label>
            <input id={startsId} type="date" value={fields.starts_on} onChange={set('starts_on')} disabled={saving} className={inputCls} />
          </div>

          <div>
            <label htmlFor={endsId} className={labelCls}>End date</label>
            <input id={endsId} type="date" value={fields.ends_on} onChange={set('ends_on')} disabled={saving} className={inputCls} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor={descId} className={labelCls}>Description</label>
            <textarea id={descId} rows={3} value={fields.description} onChange={set('description')} disabled={saving} placeholder="Optional project description…" className={`${inputCls} resize-none`} />
          </div>
        </div>
      </div>
    </AppModal>
  );
}
