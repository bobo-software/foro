import { describe, it, expect, vi, afterEach } from 'vitest';
import { aggregateTasksByProjectId, buildProjectOverviewRows, sumRollups } from './projectOverviewMetrics';

describe('aggregateTasksByProjectId', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts open, done, and overdue per project', () => {
    vi.useFakeTimers({ now: new Date('2026-07-01T12:00:00') });
    const m = aggregateTasksByProjectId(
      [
        { id: 1, business_id: 1, project_id: 10, title: 'A', status: 'todo', due_on: '2026-06-01' },
        { id: 2, business_id: 1, project_id: 10, title: 'B', status: 'done', due_on: '2026-08-01' },
        { id: 3, business_id: 1, project_id: 20, title: 'C', status: 'in_progress', due_on: '2026-07-15' },
      ],
      '2026-07-01'
    );
    expect(m.get(10)).toEqual({ total: 2, open: 1, done: 1, overdueOpen: 1 });
    expect(m.get(20)).toEqual({ total: 1, open: 1, done: 0, overdueOpen: 0 });
  });
});

describe('buildProjectOverviewRows', () => {
  it('joins company names and rollups', () => {
    const rows = buildProjectOverviewRows({
      projects: [{ id: 5, company_id: 2, name: 'Alpha' }],
      companyNameById: new Map([[2, 'North Ltd']]),
      taskRollups: new Map([[5, { total: 3, open: 2, done: 1, overdueOpen: 0 }]]),
    });
    expect(rows[0].companyName).toBe('North Ltd');
    expect(rows[0].rollup.total).toBe(3);
  });
});

describe('sumRollups', () => {
  it('sums across rows', () => {
    const total = sumRollups([
      {
        project: { id: 1, company_id: 1, name: 'A' },
        companyName: 'Co',
        rollup: { total: 2, open: 1, done: 1, overdueOpen: 1 },
        billableMinutes: null,
        billableCapped: false,
      },
      {
        project: { id: 2, company_id: 1, name: 'B' },
        companyName: 'Co',
        rollup: { total: 1, open: 1, done: 0, overdueOpen: 0 },
        billableMinutes: null,
        billableCapped: false,
      },
    ]);
    expect(total).toEqual({ total: 3, open: 2, done: 1, overdueOpen: 1 });
  });
});
