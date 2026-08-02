import { foroApiClient } from '../backend';
import type { CreateProjectTimeEntryDto, ProjectTimeEntry } from '../types/timeEntry';

const BASE = '/api/v1/project-time-entries';

/** Page size when paging through billable rows for a full rollup. */
export const BILLABLE_ROLLUP_PAGE_SIZE = 1000;

/** Max pages (safety cap). Full scan = BILLABLE_ROLLUP_PAGE_SIZE × this many rows. */
export const MAX_BILLABLE_ROLLUP_PAGES = 500;

export const MAX_BILLABLE_ROLLUP_ROWS = BILLABLE_ROLLUP_PAGE_SIZE * MAX_BILLABLE_ROLLUP_PAGES;

interface ApiRow {
  id: number;
  businessId: number;
  projectId: number;
  taskId: number | null;
  userId: number;
  loggedAt: string | null;
  durationMinutes: number;
  billable: boolean;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): ProjectTimeEntry {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    task_id: row.taskId ?? undefined,
    user_id: row.userId,
    duration_minutes: row.durationMinutes,
    billable: row.billable === undefined ? true : Boolean(row.billable),
    notes: row.notes ?? undefined,
    logged_at: row.loggedAt ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  } as ProjectTimeEntry;
}

export class TimeEntryService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<ProjectTimeEntry[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      limit: params?.limit ?? 2000,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.project_id ?? where.projectId) !== undefined && { projectId: where.project_id ?? where.projectId }),
      ...((where.task_id ?? where.taskId) !== undefined && { taskId: where.task_id ?? where.taskId }),
      ...((where.user_id ?? where.userId) !== undefined && { userId: where.user_id ?? where.userId }),
    });
    let rows = (response.data ?? []).map(fromApi);
    // `billable` is not a server-side filter on this resource — apply client-side.
    if (where.billable !== undefined) {
      rows = rows.filter((r) => r.billable === where.billable);
    }
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof ProjectTimeEntry;
      rows = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      });
    }
    return rows;
  }

  static async create(data: CreateProjectTimeEntryDto): Promise<ProjectTimeEntry> {
    const body: Record<string, unknown> = {
      businessId: data.business_id,
      projectId: data.project_id,
      taskId: data.task_id,
      userId: data.user_id,
      loggedAt: data.logged_at,
      durationMinutes: data.duration_minutes,
      billable: data.billable,
      notes: data.notes,
    };
    const response = await foroApiClient.post<ApiRow>(BASE, body);
    return fromApi(response.data);
  }

  /**
   * Sum all billable minutes for a project by paging through matching rows (table select has no SQL SUM).
   * `billable` is not a server-side filter on this resource (see `findAll`), so each page is fetched
   * unfiltered by billable and filtered client-side — pagination must advance by the *raw* page size,
   * not the filtered count, or a page with few billable rows would end the scan early while raw rows
   * remain. Stops early when a raw page returns fewer than {@link BILLABLE_ROLLUP_PAGE_SIZE} rows, or
   * when {@link MAX_BILLABLE_ROLLUP_PAGES} pages are read — then `capped` is true.
   */
  static async sumBillableMinutesForProject(params: {
    project_id: number;
    business_id: number;
  }): Promise<{ totalMinutes: number; entryCount: number; capped: boolean }> {
    const where = { project_id: params.project_id, business_id: params.business_id };
    let offset = 0;
    let totalMinutes = 0;
    let entryCount = 0;
    let capped = false;

    for (let page = 0; page < MAX_BILLABLE_ROLLUP_PAGES; page++) {
      const rawRows = await this.findAll({
        where,
        orderBy: 'logged_at',
        orderDirection: 'DESC',
        limit: BILLABLE_ROLLUP_PAGE_SIZE,
        offset,
      });
      for (const r of rawRows) {
        if (!r.billable) continue;
        entryCount += 1;
        totalMinutes += Number.isFinite(r.duration_minutes) ? r.duration_minutes : 0;
      }
      if (rawRows.length < BILLABLE_ROLLUP_PAGE_SIZE) {
        break;
      }
      offset += BILLABLE_ROLLUP_PAGE_SIZE;
      if (page === MAX_BILLABLE_ROLLUP_PAGES - 1) {
        capped = true;
      }
    }

    return { totalMinutes, entryCount, capped };
  }
}

export default TimeEntryService;
