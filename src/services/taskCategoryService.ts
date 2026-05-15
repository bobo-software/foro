import { skaftinClient } from '../backend';
import type { TaskCategory, CreateTaskCategoryDto } from '../types/taskCategory';
import { DEFAULT_TASK_CATEGORIES } from '../types/taskCategory';

const TABLE = 'project_task_statuses';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeCategory(raw: Record<string, unknown>): TaskCategory {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    name: String(raw.name ?? ''),
    slug: String(raw.slug ?? ''),
    color: raw.color != null ? String(raw.color) : null,
    position: raw.position != null ? Number(raw.position) : 0,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

export class TaskCategoryService {
  static async findByProject(projectId: number, businessId: number): Promise<TaskCategory[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE}/select`,
      { where: { project_id: projectId, business_id: businessId }, orderBy: 'position', orderDirection: 'ASC', limit: 100 }
    );
    return normalizeRows<Record<string, unknown>>(response).map(normalizeCategory);
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
      const response = await skaftinClient.post(
        `/app-api/database/tables/${TABLE}/insert`,
        { data: { business_id: businessId, project_id: projectId, name: d.name, slug: d.slug, color: d.color, position: i } }
      );
      const r = response as unknown as Record<string, unknown>;
      const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
      results.push(normalizeCategory(inserted as Record<string, unknown>));
    }
    return results;
  }

  static async create(data: CreateTaskCategoryDto): Promise<TaskCategory> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE}/insert`,
      { data }
    );
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeCategory(inserted as Record<string, unknown>);
  }

  static async update(id: number, data: { name?: string; color?: string | null; position?: number }): Promise<void> {
    await skaftinClient.put(
      `/app-api/database/tables/${TABLE}/update`,
      { where: { id }, data: { ...data, updated_at: new Date().toISOString() } }
    );
  }

  static async delete(id: number): Promise<void> {
    await skaftinClient.delete(
      `/app-api/database/tables/${TABLE}/delete`,
      { where: { id } }
    );
  }
}

export default TaskCategoryService;
