import { describe, it, expect, vi, beforeEach } from 'vitest';
import TimeEntryService, { BILLABLE_ROLLUP_PAGE_SIZE } from './timeEntryService';
import type { ProjectTimeEntry } from '../types/timeEntry';

describe('TimeEntryService.sumBillableMinutesForProject', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sums across multiple pages until a short page', async () => {
    const spy = vi.spyOn(TimeEntryService, 'findAll');
    const page1: ProjectTimeEntry[] = Array.from({ length: BILLABLE_ROLLUP_PAGE_SIZE }, () => ({
      business_id: 1,
      project_id: 2,
      user_id: 1,
      duration_minutes: 1,
      billable: true,
    }));
    const page2: ProjectTimeEntry[] = [{ business_id: 1, project_id: 2, user_id: 1, duration_minutes: 7, billable: true }];
    spy.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    const r = await TimeEntryService.sumBillableMinutesForProject({ project_id: 2, business_id: 1 });

    expect(r.capped).toBe(false);
    expect(r.entryCount).toBe(BILLABLE_ROLLUP_PAGE_SIZE + 1);
    expect(r.totalMinutes).toBe(BILLABLE_ROLLUP_PAGE_SIZE + 7);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
