import { foroApiClient } from '../backend';
import type { ProjectTask, CreateProjectTaskDto } from '../types/task';

const BASE = '/api/v1/project-tasks';

interface ApiTaskRow {
  id: number;
  businessId: number;
  projectId: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueOn: string | null;
  assignedToUserId: number | null;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiTaskRow): ProjectTask {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status ?? undefined,
    priority: row.priority ?? undefined,
    due_on: row.dueOn ?? undefined,
    assigned_to_user_id: row.assignedToUserId ?? undefined,
    position: row.position ?? 0,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateProjectTaskDto> & { updated_at?: string }): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.project_id !== undefined) body.projectId = data.project_id;
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.priority !== undefined) body.priority = data.priority;
  if (data.due_on !== undefined) body.dueOn = data.due_on;
  if (data.assigned_to_user_id !== undefined) body.assignedToUserId = data.assigned_to_user_id;
  if (data.position !== undefined) body.position = data.position;
  return body;
}

export class TaskService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<ProjectTask[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiTaskRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.project_id ?? where.projectId) !== undefined && { projectId: where.project_id ?? where.projectId }),
      ...(where.status !== undefined && { status: where.status }),
      ...((where.assigned_to_user_id ?? where.assignedToUserId) !== undefined && {
        assignedToUserId: where.assigned_to_user_id ?? where.assignedToUserId,
      }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof ProjectTask;
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

  static async findById(id: number): Promise<ProjectTask | null> {
    try {
      const response = await foroApiClient.get<ApiTaskRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateProjectTaskDto): Promise<ProjectTask> {
    const response = await foroApiClient.post<ApiTaskRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(
    id: number,
    data: Partial<CreateProjectTaskDto> & { updated_at?: string }
  ): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiTaskRow>(`${BASE}/${id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default TaskService;
