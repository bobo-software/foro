import type { ProjectTask } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';

function isDone(status: string | undefined): boolean {
  return String(status ?? 'todo') === 'done';
}

/**
 * For each successor task id, labels of open predecessors that block it (predecessor not done).
 */
export function blockedByLabelBySuccessorId(
  tasks: ProjectTask[],
  dependencies: ProjectTaskDependency[] | undefined
): Map<number, string> {
  const titleById = new Map<number, string>();
  const statusById = new Map<number, string>();
  for (const t of tasks) {
    if (t.id == null) continue;
    titleById.set(t.id, t.title || `Task #${t.id}`);
    statusById.set(t.id, String(t.status ?? 'todo'));
  }

  const m = new Map<number, string>();
  for (const d of dependencies ?? []) {
    const predStatus = statusById.get(d.predecessor_task_id);
    if (predStatus == null || isDone(predStatus)) continue;
    const predTitle = titleById.get(d.predecessor_task_id) ?? `#${d.predecessor_task_id}`;
    const cur = m.get(d.successor_task_id);
    m.set(d.successor_task_id, cur ? `${cur}, ${predTitle}` : predTitle);
  }
  return m;
}
