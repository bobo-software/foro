import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppPageHeader } from '@/components/ComponentsIndex';
import ProjectService from '@/services/projectService';
import TaskService from '@/services/taskService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import useAuthStore from '@/stores/data/AuthStore';
import type { Project } from '@/types/project';
import type { ProjectTask, ProjectTaskStatus } from '@/types/task';

const MY_TASKS_PAGE_SIZE = 150;

function statusLabel(s: ProjectTaskStatus): string {
  return String(s)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function MyTasksPage() {
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const bid = useBusinessStore((s) => s.currentBusiness?.id);
  const userId = sessionUser?.id != null ? Number(sessionUser.id) : NaN;

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [projectsById, setProjectsById] = useState<Record<number, Project>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(userId) || bid == null) {
      setLoading(false);
      setTasks([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    TaskService.findAll({
      where: { business_id: bid, assigned_to_user_id: userId },
      orderBy: 'due_on',
      orderDirection: 'ASC',
      limit: MY_TASKS_PAGE_SIZE,
      offset: 0,
    })
      .then((rows) => {
        if (cancelled) return;
        setTasks(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tasks');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, bid]);

  useEffect(() => {
    const ids = [...new Set(tasks.map((t) => t.project_id).filter((id) => Number.isFinite(id)))];
    if (ids.length === 0) {
      setProjectsById({});
      return;
    }
    let cancelled = false;
    Promise.all(ids.map((id) => ProjectService.findById(id))).then((rows) => {
      if (cancelled) return;
      const map: Record<number, Project> = {};
      for (const p of rows) {
        if (p?.id != null) map[p.id] = p;
      }
      setProjectsById(map);
    });
    return () => {
      cancelled = true;
    };
  }, [tasks]);

  if (!Number.isFinite(userId)) {
    return <p className="text-slate-600 dark:text-slate-400">Sign in to see your tasks.</p>;
  }

  if (bid == null) {
    return (
      <p className="text-amber-700 dark:text-amber-300">
        Select a business in the app header to see tasks assigned to you in that business.
      </p>
    );
  }

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (error) {
    return <p className="text-red-600 dark:text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        title="My tasks"
        subtitle="Work assigned to you in this business (open the project to edit)"
        showBackButton
        backButtonText="Dashboard"
        onBackClick={() => navigate('/app/dashboard')}
      />

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No tasks assigned to you in this business.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing up to {MY_TASKS_PAGE_SIZE} tasks, oldest due date first.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">Tasks assigned to you in the current business</caption>
              <thead className="border-b border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                <tr>
                  <th scope="col" className="py-2 px-3 font-medium">
                    Task
                  </th>
                  <th scope="col" className="py-2 px-3 font-medium">
                    Project
                  </th>
                  <th scope="col" className="py-2 px-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 px-3 font-medium">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  if (t.id == null) return null;
                  const pr = projectsById[t.project_id];
                  const companyId = pr?.company_id;
                  const href =
                    companyId != null && t.project_id != null
                      ? `/app/companies/${companyId}/projects/${t.project_id}`
                      : null;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-100 max-w-xs">
                        {href ? (
                          <Link to={href} className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline">
                            {t.title}
                          </Link>
                        ) : (
                          t.title
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {pr?.name ?? `Project #${t.project_id}`}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {statusLabel((t.status ?? 'todo') as ProjectTaskStatus)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {t.due_on ? String(t.due_on).slice(0, 10) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
