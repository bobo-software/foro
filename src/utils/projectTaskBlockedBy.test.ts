import { describe, it, expect } from 'vitest';
import { blockedByLabelBySuccessorId } from './projectTaskBlockedBy';

describe('blockedByLabelBySuccessorId', () => {
  it('lists open predecessors blocking a successor', () => {
    const tasks = [
      { id: 1, business_id: 1, project_id: 1, title: 'A', status: 'todo' },
      { id: 2, business_id: 1, project_id: 1, title: 'B', status: 'in_progress' },
    ];
    const deps = [
      { business_id: 1, project_id: 1, predecessor_task_id: 1, successor_task_id: 2 },
    ];
    const m = blockedByLabelBySuccessorId(tasks, deps);
    expect(m.get(2)).toBe('A');
  });

  it('ignores done predecessors', () => {
    const tasks = [
      { id: 1, business_id: 1, project_id: 1, title: 'A', status: 'done' },
      { id: 2, business_id: 1, project_id: 1, title: 'B', status: 'todo' },
    ];
    const deps = [
      { business_id: 1, project_id: 1, predecessor_task_id: 1, successor_task_id: 2 },
    ];
    expect(blockedByLabelBySuccessorId(tasks, deps).get(2)).toBeUndefined();
  });
});
