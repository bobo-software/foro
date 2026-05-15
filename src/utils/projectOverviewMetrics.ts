import type { Project } from '@/types/project';
import type { ProjectTask } from '@/types/task';
import { localDateISO } from '@/utils/localDateISO';

export type ProjectTaskRollup = {
  total: number;
  open: number;
  done: number;
  overdueOpen: number;
};

export type ProjectOverviewRow = {
  project: Project;
  companyName: string;
  rollup: ProjectTaskRollup;
  billableMinutes: number | null;
  billableCapped: boolean;
};

function isOpenTask(status: string | undefined): boolean {
  return String(status ?? 'todo') !== 'done';
}

/** Aggregate task counts per `project_id` from a scanned task list. */
export function aggregateTasksByProjectId(
  tasks: ProjectTask[],
  todayIso = localDateISO()
): Map<number, ProjectTaskRollup> {
  const m = new Map<number, ProjectTaskRollup>();
  for (const t of tasks) {
    const pid = t.project_id;
    if (!Number.isFinite(pid)) continue;
    const cur = m.get(pid) ?? { total: 0, open: 0, done: 0, overdueOpen: 0 };
    cur.total += 1;
    const status = String(t.status ?? 'todo');
    if (status === 'done') cur.done += 1;
    else cur.open += 1;
    const due = t.due_on?.slice(0, 10) ?? '';
    if (due.length === 10 && due < todayIso && isOpenTask(status)) cur.overdueOpen += 1;
    m.set(pid, cur);
  }
  return m;
}

export function buildProjectOverviewRows(params: {
  projects: Project[];
  companyNameById: Map<number, string>;
  taskRollups: Map<number, ProjectTaskRollup>;
  billableByProjectId?: Map<number, { minutes: number; capped: boolean }>;
}): ProjectOverviewRow[] {
  return params.projects
    .filter((p) => p.id != null)
    .map((project) => {
      const id = project.id!;
      const rollup = params.taskRollups.get(id) ?? { total: 0, open: 0, done: 0, overdueOpen: 0 };
      const bill = params.billableByProjectId?.get(id);
      return {
        project,
        companyName: params.companyNameById.get(project.company_id) ?? `Company #${project.company_id}`,
        rollup,
        billableMinutes: bill != null ? bill.minutes : null,
        billableCapped: bill?.capped ?? false,
      };
    });
}

export function sumRollups(rows: ProjectOverviewRow[]): ProjectTaskRollup {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + r.rollup.total,
      open: acc.open + r.rollup.open,
      done: acc.done + r.rollup.done,
      overdueOpen: acc.overdueOpen + r.rollup.overdueOpen,
    }),
    { total: 0, open: 0, done: 0, overdueOpen: 0 }
  );
}
