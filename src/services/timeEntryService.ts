import { skaftinClient } from '../backend';
import type { CreateProjectTimeEntryDto, ProjectTimeEntry } from '../types/timeEntry';

const TABLE_NAME = 'project_time_entries';

/** Page size when paging through billable rows for a full rollup. */
export const BILLABLE_ROLLUP_PAGE_SIZE = 1000;

/** Max pages (safety cap). Full scan = BILLABLE_ROLLUP_PAGE_SIZE × this many rows. */
export const MAX_BILLABLE_ROLLUP_PAGES = 500;

export const MAX_BILLABLE_ROLLUP_ROWS = BILLABLE_ROLLUP_PAGE_SIZE * MAX_BILLABLE_ROLLUP_PAGES;

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeEntry(raw: Record<string, unknown>): ProjectTimeEntry {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    task_id: raw.task_id != null ? Number(raw.task_id) : undefined,
    user_id: Number(raw.user_id),
    duration_minutes: Number(raw.duration_minutes),
    billable: raw.billable === undefined ? true : Boolean(raw.billable),
    notes: raw.notes != null ? String(raw.notes) : undefined,
    logged_at: raw.logged_at != null ? String(raw.logged_at) : undefined,
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
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 2000,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    return rows.map((row) => normalizeEntry(row));
  }

  static async create(data: CreateProjectTimeEntryDto): Promise<ProjectTimeEntry> {
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/insert`, {
      data,
    });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeEntry(inserted as Record<string, unknown>);
  }

  /**
   * Sum all billable minutes for a project by paging through matching rows (table select has no SQL SUM).
   * Stops early when a page returns fewer than {@link BILLABLE_ROLLUP_PAGE_SIZE} rows, or when
   * {@link MAX_BILLABLE_ROLLUP_PAGES} pages are read — then `capped` is true.
   */
  static async sumBillableMinutesForProject(params: {
    project_id: number;
    business_id: number;
  }): Promise<{ totalMinutes: number; entryCount: number; capped: boolean }> {
    const where = { project_id: params.project_id, business_id: params.business_id, billable: true };
    let offset = 0;
    let totalMinutes = 0;
    let entryCount = 0;
    let capped = false;

    for (let page = 0; page < MAX_BILLABLE_ROLLUP_PAGES; page++) {
      const rows = await this.findAll({
        where,
        orderBy: 'logged_at',
        orderDirection: 'DESC',
        limit: BILLABLE_ROLLUP_PAGE_SIZE,
        offset,
      });
      for (const r of rows) {
        entryCount += 1;
        totalMinutes += Number.isFinite(r.duration_minutes) ? r.duration_minutes : 0;
      }
      if (rows.length < BILLABLE_ROLLUP_PAGE_SIZE) {
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
