import { describe, expect, it } from 'vitest';
import type { ProjectTask } from '@/types/task';
import { computeKanbanDragUpdates, taskDndId } from './projectKanbanReorder';

function row(
  id: number,
  status: string,
  position: number,
  overrides: Partial<ProjectTask> = {}
): ProjectTask {
  return {
    id,
    business_id: 1,
    project_id: 1,
    title: `Task ${id}`,
    status,
    position,
    ...overrides,
  };
}

describe('computeKanbanDragUpdates', () => {
  it('returns null when dropping a task on itself', () => {
    const tasks = [row(1, 'todo', 0), row(2, 'todo', 1)];
    expect(computeKanbanDragUpdates(tasks, taskDndId(1), taskDndId(1))).toBeNull();
  });

  it('reorders within the same column', () => {
    const tasks = [row(1, 'todo', 0), row(2, 'todo', 1), row(3, 'todo', 2)];
    const updates = computeKanbanDragUpdates(tasks, taskDndId(1), taskDndId(3));
    expect(updates).not.toBeNull();
    expect(updates!.map((u) => [u.taskId, u.position])).toEqual([
      [2, 0],
      [3, 1],
      [1, 2],
    ]);
    expect(updates!.every((u) => u.status === 'todo')).toBe(true);
  });

  it('moves a task to another column before a target card', () => {
    const tasks = [row(1, 'todo', 0), row(2, 'todo', 1), row(10, 'done', 0)];
    const updates = computeKanbanDragUpdates(tasks, taskDndId(1), taskDndId(10));
    expect(updates).not.toBeNull();
    const byId = Object.fromEntries(updates!.map((u) => [u.taskId, u]));
    expect(byId[2]).toMatchObject({ position: 0, status: 'todo' });
    expect(byId[1]).toMatchObject({ position: 0, status: 'done' });
    expect(byId[10]).toMatchObject({ position: 1, status: 'done' });
  });

  it('appends when dropping on an empty column droppable', () => {
    const tasks = [row(1, 'todo', 0), row(2, 'in_progress', 0)];
    const updates = computeKanbanDragUpdates(tasks, taskDndId(1), 'done');
    expect(updates).not.toBeNull();
    const byId = Object.fromEntries(updates!.map((u) => [u.taskId, u]));
    expect(byId[1]).toMatchObject({ position: 0, status: 'done' });
  });
});
