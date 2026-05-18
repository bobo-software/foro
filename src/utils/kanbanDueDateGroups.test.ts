import { describe, it, expect } from 'vitest';
import { groupKanbanColumnTasksByDueDate, labelForDueDate } from './kanbanDueDateGroups';
import type { ProjectTask } from '@/types/task';

const base = (overrides: Partial<ProjectTask>): ProjectTask => ({
  business_id: 1,
  project_id: 1,
  title: 'Task',
  ...overrides,
});

describe('kanbanDueDateGroups', () => {
  it('labels today and yesterday', () => {
    expect(labelForDueDate('2026-05-18', '2026-05-18')).toBe('Today');
    expect(labelForDueDate('2026-05-17', '2026-05-18')).toBe('Yesterday');
  });

  it('orders groups as today then yesterday', () => {
    const groups = groupKanbanColumnTasksByDueDate(
      [
        base({ id: 1, status: 'todo', due_on: '2026-05-17', position: 0 }),
        base({ id: 2, status: 'todo', due_on: '2026-05-18', position: 0 }),
      ],
      '2026-05-18'
    );
    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday']);
    expect(groups[0].tasks.map((t) => t.id)).toEqual([2]);
    expect(groups[1].tasks.map((t) => t.id)).toEqual([1]);
  });

  it('puts overdue before today and keeps yesterday separate', () => {
    const groups = groupKanbanColumnTasksByDueDate(
      [
        base({ id: 1, status: 'todo', due_on: '2026-05-10', position: 0 }),
        base({ id: 2, status: 'todo', due_on: '2026-05-17', position: 0 }),
        base({ id: 3, status: 'todo', due_on: '2026-05-18', position: 0 }),
      ],
      '2026-05-18'
    );
    expect(groups.map((g) => g.label)).toEqual(['Overdue', 'Today', 'Yesterday']);
  });
});
