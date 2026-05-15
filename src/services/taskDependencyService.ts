import { skaftinClient } from '../backend';
import type { CreateProjectTaskDependencyDto, ProjectTaskDependency } from '../types/taskDependency';
import TaskService from './taskService';

const TABLE_NAME = 'project_task_dependencies';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeRow(raw: Record<string, unknown>): ProjectTaskDependency {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    predecessor_task_id: Number(raw.predecessor_task_id),
    successor_task_id: Number(raw.successor_task_id),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
  };
}

export class TaskDependencyService {
  static async findByProject(projectId: number, businessId: number): Promise<ProjectTaskDependency[]> {
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/select`, {
      where: { project_id: projectId, business_id: businessId },
      orderBy: 'id',
      orderDirection: 'ASC',
      limit: 2000,
      offset: 0,
    });
    return normalizeRows<Record<string, unknown>>(response).map((row) => normalizeRow(row));
  }

  static async create(data: CreateProjectTaskDependencyDto): Promise<ProjectTaskDependency> {
    if (data.predecessor_task_id === data.successor_task_id) {
      throw new Error('Predecessor and successor must be different tasks');
    }
    const [pred, succ] = await Promise.all([
      TaskService.findById(data.predecessor_task_id),
      TaskService.findById(data.successor_task_id),
    ]);
    if (!pred || !succ) throw new Error('Both tasks must exist');
    if (Number(pred.project_id) !== data.project_id || Number(succ.project_id) !== data.project_id) {
      throw new Error('Tasks must belong to this project');
    }
    if (Number(pred.business_id) !== data.business_id || Number(succ.business_id) !== data.business_id) {
      throw new Error('Tasks must belong to this business scope');
    }
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/insert`, { data });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeRow(inserted as Record<string, unknown>);
  }

  static async delete(id: number, businessId: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(`/app-api/database/tables/${TABLE_NAME}/delete`, {
      where: { id, business_id: businessId },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default TaskDependencyService;
