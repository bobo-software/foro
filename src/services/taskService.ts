import { skaftinClient } from '../backend';
import type { ProjectTask, CreateProjectTaskDto } from '../types/task';

const TABLE_NAME = 'project_tasks';

/**
 * CRUD for `project_tasks`. `business_id` is not FK-enforced in DB; callers must align with the parent `projects` row.
 */
function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeTask(raw: Record<string, unknown>): ProjectTask {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    title: String(raw.title ?? ''),
    description: raw.description != null ? String(raw.description) : undefined,
    status: raw.status != null ? String(raw.status) : undefined,
    priority: raw.priority != null ? String(raw.priority) : undefined,
    due_on: raw.due_on != null ? String(raw.due_on).slice(0, 10) : undefined,
    assigned_to_user_id:
      raw.assigned_to_user_id != null ? Number(raw.assigned_to_user_id) : undefined,
    position: raw.position != null ? Number(raw.position) : 0,
  } as ProjectTask;
}

export class TaskService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<ProjectTask[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 5000,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    return rows.map((row) => normalizeTask(row));
  }

  static async findById(id: number): Promise<ProjectTask | null> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { where: { id }, limit: 1, offset: 0 }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    const row = rows[0] ?? null;
    return row ? normalizeTask(row) : null;
  }

  static async create(data: CreateProjectTaskDto): Promise<ProjectTask> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data }
    );
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeTask(inserted as Record<string, unknown>);
  }

  static async update(
    id: number,
    data: Partial<CreateProjectTaskDto> & { updated_at?: string }
  ): Promise<{ rowCount: number }> {
    const response = await skaftinClient.put(
      `/app-api/database/tables/${TABLE_NAME}/update`,
      { where: { id }, data }
    );
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(
      `/app-api/database/tables/${TABLE_NAME}/delete`,
      { where: { id } }
    );
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default TaskService;
