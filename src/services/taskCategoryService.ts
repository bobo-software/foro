import { foroApiClient } from '../backend';
import type { TaskCategory, CreateTaskCategoryDto } from '../types/taskCategory';
import { DEFAULT_TASK_CATEGORIES } from '../types/taskCategory';

const BASE = '/api/v1/project-task-statuses';

interface ApiRow {
  id: number;
  businessId: number;
  projectId: number;
  name: string;
  slug: string;
  color: string | null;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): TaskCategory {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    name: row.name,
    slug: row.slug,
    color: row.color,
    position: row.position ?? 0,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

export class TaskCategoryService {
  static async findByProject(projectId: number, businessId: number): Promise<TaskCategory[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      projectId,
      businessId,
      limit: 100,
    });
    const rows = (response.data ?? []).map(fromApi);
    return rows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  /** Fetch categories for a project; if none exist, seed defaults and return them. */
  static async findOrSeedByProject(projectId: number, businessId: number): Promise<TaskCategory[]> {
    const existing = await TaskCategoryService.findByProject(projectId, businessId);
    if (existing.length > 0) return existing;
    return TaskCategoryService.seedDefaults(projectId, businessId);
  }

  static async seedDefaults(projectId: number, businessId: number): Promise<TaskCategory[]> {
    const results: TaskCategory[] = [];
    for (let i = 0; i < DEFAULT_TASK_CATEGORIES.length; i++) {
      const d = DEFAULT_TASK_CATEGORIES[i];
      const response = await foroApiClient.post<ApiRow>(BASE, {
        businessId,
        projectId,
        name: d.name,
        slug: d.slug,
        color: d.color,
        position: i,
      });
      results.push(fromApi(response.data));
    }
    return results;
  }

  static async create(data: CreateTaskCategoryDto): Promise<TaskCategory> {
    const response = await foroApiClient.post<ApiRow>(BASE, {
      businessId: data.business_id,
      projectId: data.project_id,
      name: data.name,
      slug: data.slug,
      color: data.color,
      position: data.position,
    });
    return fromApi(response.data);
  }

  static async update(id: number, data: { name?: string; color?: string | null; position?: number }): Promise<void> {
    await foroApiClient.put(`${BASE}/${id}`, data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default TaskCategoryService;
