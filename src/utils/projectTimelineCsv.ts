import type { ProjectTask } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import { buildCsvLines } from './csvDownload';
import { blockedByLabelBySuccessorId } from './projectTaskBlockedBy';
import { localDateISO } from './localDateISO';

function isOpenTask(status: string | undefined): boolean {
  return String(status ?? 'todo') !== 'done';
}

/** Build CSV for timeline export from loaded tasks + dependencies. */
export function buildProjectTimelineCsv(tasks: ProjectTask[], dependencies?: ProjectTaskDependency[]): string {
  const todayIso = localDateISO();
  const blocked = blockedByLabelBySuccessorId(tasks, dependencies);
  const afterBySuccessor = new Map<number, string>();
  const titleById = new Map<number, string>();
  for (const t of tasks) {
    if (t.id == null) continue;
    titleById.set(t.id, t.title || `Task #${t.id}`);
  }
  for (const d of dependencies ?? []) {
    const pred = titleById.get(d.predecessor_task_id) ?? `#${d.predecessor_task_id}`;
    const cur = afterBySuccessor.get(d.successor_task_id);
    afterBySuccessor.set(d.successor_task_id, cur ? `${cur}, ${pred}` : pred);
  }

  const headers = ['id', 'title', 'status', 'due_on', 'overdue_open', 'blocked_by', 'after'];
  const rows = tasks
    .filter((t) => t.id != null)
    .map((t) => {
      const due = t.due_on?.slice(0, 10) ?? '';
      const overdue =
        due.length === 10 && due < todayIso && isOpenTask(t.status) ? 'yes' : 'no';
      return [
        t.id,
        t.title,
        t.status ?? '',
        due,
        overdue,
        t.id != null ? (blocked.get(t.id) ?? '') : '',
        t.id != null ? (afterBySuccessor.get(t.id) ?? '') : '',
      ];
    });
  return buildCsvLines(headers, rows);
}
