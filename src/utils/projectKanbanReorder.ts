import { arrayMove } from '@dnd-kit/sortable';
import type { ProjectTask, ProjectTaskStatus } from '@/types/task';

export const KANBAN_COLUMN_IDS: ProjectTaskStatus[] = [
  'todo',
  'in_progress',
  'review',
  'blocked',
  'done',
];

export type KanbanPositionUpdate = {
  taskId: number;
  position: number;
  status: ProjectTaskStatus;
};

export function taskDndId(taskId: number): string {
  return `task-${taskId}`;
}

export function parseTaskDndId(id: string): number | null {
  if (!id.startsWith('task-')) return null;
  const n = Number(id.slice(5));
  return Number.isFinite(n) ? n : null;
}

function sortedInColumn(tasks: ProjectTask[], col: ProjectTaskStatus): ProjectTask[] {
  return tasks
    .filter((t) => t.id != null && (t.status ?? 'todo') === col)
    .sort(
      (a, b) =>
        (Number(a.position) || 0) - (Number(b.position) || 0) ||
        (Number(a.id) || 0) - (Number(b.id) || 0)
    );
}

/**
 * Computes normalized `{ taskId, position, status }` updates after a Kanban drag.
 * Returns `null` when nothing changes.
 * Pass `columnIds` to support dynamic categories; falls back to the static default list.
 */
export function computeKanbanDragUpdates(
  tasks: ProjectTask[],
  activeDndId: string,
  overDndId: string,
  columnIds: readonly string[] = KANBAN_COLUMN_IDS
): KanbanPositionUpdate[] | null {
  const isColId = (id: string) => columnIds.includes(id);

  const activeId = parseTaskDndId(activeDndId);
  if (activeId == null) return null;

  const activeTask = tasks.find((t) => t.id === activeId);
  if (!activeTask) return null;

  const activeCol = (activeTask.status ?? 'todo') as ProjectTaskStatus;

  let overCol: ProjectTaskStatus;
  let overTaskId: number | null = null;

  if (isColId(overDndId)) {
    overCol = overDndId;
  } else {
    const oid = parseTaskDndId(overDndId);
    if (oid == null) return null;
    if (oid === activeId) return null;
    overTaskId = oid;
    const overTask = tasks.find((t) => t.id === oid);
    if (!overTask) return null;
    overCol = (overTask.status ?? 'todo') as ProjectTaskStatus;
  }

  if (activeCol === overCol) {
    const col = sortedInColumn(tasks, activeCol);
    const oldIndex = col.findIndex((t) => t.id === activeId);
    if (oldIndex < 0) return null;

    let newIndex: number;
    if (isColId(overDndId)) {
      newIndex = Math.max(0, col.length - 1);
    } else {
      newIndex = col.findIndex((t) => t.id === overTaskId);
      if (newIndex < 0) return null;
    }

    if (oldIndex === newIndex) return null;

    const newOrder = arrayMove(col, oldIndex, newIndex);
    return newOrder.map((t, i) => ({
      taskId: t.id!,
      position: i,
      status: activeCol,
    }));
  }

  const sourceCol = sortedInColumn(tasks, activeCol);
  const targetCol = sortedInColumn(tasks, overCol).filter((t) => t.id !== activeId);
  const oldIndex = sourceCol.findIndex((t) => t.id === activeId);
  if (oldIndex < 0) return null;
  const moving = sourceCol[oldIndex];
  const newSource = sourceCol.filter((_, i) => i !== oldIndex);

  let insertAt: number;
  if (isColId(overDndId)) {
    insertAt = targetCol.length;
  } else {
    const idx = targetCol.findIndex((t) => t.id === overTaskId);
    insertAt = idx < 0 ? targetCol.length : idx;
  }

  const newTarget = [...targetCol.slice(0, insertAt), moving, ...targetCol.slice(insertAt)];

  const updates: KanbanPositionUpdate[] = [];
  newSource.forEach((t, i) => {
    updates.push({ taskId: t.id!, position: i, status: activeCol });
  });
  newTarget.forEach((t, i) => {
    updates.push({ taskId: t.id!, position: i, status: overCol });
  });
  return updates;
}
