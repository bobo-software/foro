import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CompanyService from '@/services/companyService';
import PortalInviteService from '@/services/portalInviteService';
import ProjectService from '@/services/projectService';
import TaskDependencyService from '@/services/taskDependencyService';
import TaskService from '@/services/taskService';
import type { Company } from '@/types/company';
import type { PortalInvite } from '@/types/portalInvite';
import type { Project } from '@/types/project';
import type { ProjectTask } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import { sha256Hex } from '@/utils/sha256Hex';
import { buildProjectTimelineCsv } from '@/utils/projectTimelineCsv';
import { downloadCsvFile } from '@/utils/csvDownload';
import { ProjectTasksTimeline } from '@/pages/admin/companies/ProjectTasksTimeline';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import toast from 'react-hot-toast';

const PORTAL_GENERIC_ERROR =
  'We could not load this shared view. The link may be wrong, expired, or the service is temporarily unavailable.';

const PORTAL_TASK_PAGE_SIZE = 50;

function mergeTasksById(prev: ProjectTask[], more: ProjectTask[]): ProjectTask[] {
  const seen = new Set(prev.map((t) => t.id));
  const out = [...prev];
  for (const t of more) {
    if (t.id != null && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

/**
 * Read-only project view for a valid portal invite token (no Foro login).
 */
export function PortalProjectViewPage() {
  usePortalNoIndex();
  const { portalToken } = useParams<{ portalToken: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [invite, setInvite] = useState<PortalInvite | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [deps, setDeps] = useState<ProjectTaskDependency[]>([]);
  const [tasksLoadingMore, setTasksLoadingMore] = useState(false);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const taskOffsetRef = useRef(0);

  const decodedToken = useMemo(() => {
    const rawParam = portalToken?.trim() ?? '';
    if (!rawParam) return '';
    try {
      return decodeURIComponent(rawParam).trim();
    } catch {
      return rawParam.trim();
    }
  }, [portalToken]);

  const loadTaskPage = useCallback(
    async (inv: PortalInvite, mode: 'reset' | 'append') => {
      if (mode === 'reset') taskOffsetRef.current = 0;
      const offset = taskOffsetRef.current;
      const rows = await TaskService.findAll({
        where: { project_id: inv.project_id, business_id: inv.business_id },
        orderBy: 'position',
        orderDirection: 'ASC',
        limit: PORTAL_TASK_PAGE_SIZE,
        offset,
      });
      setHasMoreTasks(rows.length === PORTAL_TASK_PAGE_SIZE);
      if (mode === 'append') {
        setTasks((prev) => mergeTasksById(prev, rows));
        taskOffsetRef.current += rows.length;
      } else {
        setTasks(rows);
        taskOffsetRef.current = rows.length;
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!decodedToken) {
        setError('This link is missing a token.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const hash = await sha256Hex(decodedToken);
        const inv = await PortalInviteService.findActiveByTokenHash(hash);
        if (cancelled) return;
        if (!inv) {
          setError('This link is invalid, expired, or has been revoked.');
          setLoading(false);
          return;
        }
        setInvite(inv);
        const [pr, depRows] = await Promise.all([
          ProjectService.findById(inv.project_id),
          TaskDependencyService.findByProject(inv.project_id, inv.business_id),
        ]);
        if (cancelled) return;
        if (!pr) {
          setError('This project is no longer available.');
          setLoading(false);
          return;
        }
        setProject(pr);
        setDeps(depRows);
        await loadTaskPage(inv, 'reset');
        if (cancelled) return;
        try {
          const co = await CompanyService.findById(pr.company_id);
          if (!cancelled) setCompany(co ?? null);
        } catch {
          if (!cancelled) setCompany(null);
        }
      } catch {
        if (!cancelled) setError(PORTAL_GENERIC_ERROR);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [decodedToken, loadTaskPage]);

  const loadMoreTasks = useCallback(async () => {
    if (invite == null || tasksLoadingMore) return;
    setTasksLoadingMore(true);
    try {
      await loadTaskPage(invite, 'append');
    } catch {
      toast.error('Could not load more tasks');
    } finally {
      setTasksLoadingMore(false);
    }
  }, [invite, tasksLoadingMore, loadTaskPage]);

  const exportPortalTimelineCsv = useCallback(() => {
    if (project?.id == null) return;
    if (tasks.filter((t) => t.id != null).length === 0) {
      toast.error('No tasks loaded to export');
      return;
    }
    downloadCsvFile(`project-${project.id}-portal-timeline.csv`, buildProjectTimelineCsv(tasks, deps));
    toast.success('Timeline CSV downloaded');
  }, [project?.id, tasks, deps]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-lg space-y-4 animate-pulse" aria-busy="true" aria-label="Loading shared project">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-28" />
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p className="text-slate-700 dark:text-slate-200 text-center max-w-md text-sm leading-relaxed">{error ?? 'Not available.'}</p>
        <Link to="/portal" className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
          Client portal information
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white print:text-black">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur print:border-slate-300">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Shared project</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{project.name}</h1>
            {company && <p className="text-sm text-slate-600 dark:text-slate-400">{company.name}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-9 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Print
            </button>
            <Link
              to="/login"
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline no-underline"
            >
              Team sign in
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
          Read-only view. {tasks.filter((t) => t.id != null).length} task(s) loaded
          {hasMoreTasks ? ' — more available below.' : '.'}
        </p>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 print:border-slate-300">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Timeline</h2>
          <ProjectTasksTimeline
            tasks={tasks}
            dependencies={deps}
            portalMode
            showGanttBars
            onExportCsv={exportPortalTimelineCsv}
          />
          {hasMoreTasks && (
            <div className="mt-4 print:hidden">
              <button
                type="button"
                disabled={tasksLoadingMore}
                onClick={() => void loadMoreTasks()}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {tasksLoadingMore ? 'Loading…' : 'Load more tasks'}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
