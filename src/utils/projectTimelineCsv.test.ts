import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildProjectTimelineCsv } from './projectTimelineCsv';

describe('buildProjectTimelineCsv', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes overdue and dependency columns', () => {
    vi.useFakeTimers({ now: new Date('2026-07-01T12:00:00') });
    const csv = buildProjectTimelineCsv(
      [
        {
          id: 2,
          business_id: 1,
          project_id: 1,
          title: 'B',
          status: 'todo',
          due_on: '2026-06-01',
        },
      ],
      [{ business_id: 1, project_id: 1, predecessor_task_id: 1, successor_task_id: 2 }]
    );
    expect(csv).toContain('overdue_open');
    expect(csv).toContain('B');
    expect(csv).toContain('yes');
  });
});
