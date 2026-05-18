import { skaftinClient } from '../backend';
import type {
  CreateProjectTaskChecklistDto,
  CreateProjectTaskChecklistItemDto,
  ProjectTaskChecklist,
  ProjectTaskChecklistItem,
  ProjectTaskChecklistWithItems,
  UpdateProjectTaskChecklistDto,
  UpdateProjectTaskChecklistItemDto,
} from '../types/taskChecklist';
import TaskService from './taskService';

const CHECKLISTS_TABLE = 'project_task_checklists';
const ITEMS_TABLE = 'project_task_checklist_items';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeChecklist(raw: Record<string, unknown>): ProjectTaskChecklist {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    task_id: Number(raw.task_id),
    title: String(raw.title ?? ''),
    position: raw.position != null ? Number(raw.position) : 0,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

function normalizeItem(raw: Record<string, unknown>): ProjectTaskChecklistItem {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: Number(raw.project_id),
    checklist_id: Number(raw.checklist_id),
    label: String(raw.label ?? ''),
    is_done: Boolean(raw.is_done),
    position: raw.position != null ? Number(raw.position) : 0,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

async function assertTaskScope(
  taskId: number,
  businessId: number,
  projectId: number
): Promise<void> {
  const task = await TaskService.findById(taskId);
  if (!task) throw new Error('Task not found');
  if (Number(task.business_id) !== businessId || Number(task.project_id) !== projectId) {
    throw new Error('Task must belong to this business and project');
  }
}

async function assertChecklistScope(
  checklistId: number,
  businessId: number
): Promise<ProjectTaskChecklist> {
  const response = await skaftinClient.post(`/app-api/database/tables/${CHECKLISTS_TABLE}/select`, {
    where: { id: checklistId, business_id: businessId },
    limit: 1,
    offset: 0,
  });
  const rows = normalizeRows<Record<string, unknown>>(response);
  const row = rows[0];
  if (!row) throw new Error('Checklist not found');
  return normalizeChecklist(row);
}

export class TaskChecklistService {
  static async findByTask(taskId: number, businessId: number): Promise<ProjectTaskChecklistWithItems[]> {
    const response = await skaftinClient.post(`/app-api/database/tables/${CHECKLISTS_TABLE}/select`, {
      where: { task_id: taskId, business_id: businessId },
      orderBy: 'position',
      orderDirection: 'ASC',
      limit: 100,
      offset: 0,
    });
    const checklists = normalizeRows<Record<string, unknown>>(response).map((row) => normalizeChecklist(row));
    if (checklists.length === 0) return [];

    const itemsByChecklist = await Promise.all(
      checklists.map(async (cl) => {
        if (cl.id == null) return [] as ProjectTaskChecklistItem[];
        return TaskChecklistService.findItemsByChecklist(cl.id, businessId);
      })
    );

    return checklists.map((cl, i) => ({ ...cl, items: itemsByChecklist[i] ?? [] }));
  }

  /** All items for a task in display order (flattened across checklists). */
  static async listItemsByTask(taskId: number, businessId: number): Promise<ProjectTaskChecklistItem[]> {
    const checklists = await TaskChecklistService.findByTask(taskId, businessId);
    const flat: ProjectTaskChecklistItem[] = [];
    for (const cl of checklists) {
      flat.push(...cl.items);
    }
    return flat.sort((a, b) => {
      const clA = checklists.find((c) => c.id === a.checklist_id);
      const clB = checklists.find((c) => c.id === b.checklist_id);
      const orderA = (clA?.position ?? 0) * 10_000 + (a.position ?? 0);
      const orderB = (clB?.position ?? 0) * 10_000 + (b.position ?? 0);
      return orderA - orderB;
    });
  }

  /** One implicit checklist per task (created on first item if missing). */
  static async ensureChecklistForTask(
    taskId: number,
    businessId: number,
    projectId: number
  ): Promise<number> {
    const checklists = await TaskChecklistService.findByTask(taskId, businessId);
    const firstId = checklists[0]?.id;
    if (firstId != null) return firstId;
    const created = await TaskChecklistService.createChecklist({
      business_id: businessId,
      project_id: projectId,
      task_id: taskId,
      title: 'Checklist',
      position: 0,
    });
    if (created.id == null) throw new Error('Failed to create checklist');
    return created.id;
  }

  static async findItemsByChecklist(
    checklistId: number,
    businessId: number
  ): Promise<ProjectTaskChecklistItem[]> {
    const response = await skaftinClient.post(`/app-api/database/tables/${ITEMS_TABLE}/select`, {
      where: { checklist_id: checklistId, business_id: businessId },
      orderBy: 'position',
      orderDirection: 'ASC',
      limit: 500,
      offset: 0,
    });
    return normalizeRows<Record<string, unknown>>(response).map((row) => normalizeItem(row));
  }

  static async createChecklist(data: CreateProjectTaskChecklistDto): Promise<ProjectTaskChecklist> {
    await assertTaskScope(data.task_id, data.business_id, data.project_id);
    const response = await skaftinClient.post(`/app-api/database/tables/${CHECKLISTS_TABLE}/insert`, {
      data: {
        business_id: data.business_id,
        project_id: data.project_id,
        task_id: data.task_id,
        title: data.title.trim(),
        position: data.position ?? 0,
      },
    });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeChecklist(inserted as Record<string, unknown>);
  }

  static async updateChecklist(
    id: number,
    businessId: number,
    data: UpdateProjectTaskChecklistDto
  ): Promise<{ rowCount: number }> {
    await assertChecklistScope(id, businessId);
    const payload: Record<string, unknown> = { ...data };
    if (data.title != null) payload.title = data.title.trim();
    const response = await skaftinClient.put(`/app-api/database/tables/${CHECKLISTS_TABLE}/update`, {
      where: { id, business_id: businessId },
      data: payload,
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async deleteChecklist(id: number, businessId: number): Promise<{ rowCount: number }> {
    await assertChecklistScope(id, businessId);
    const response = await skaftinClient.delete(`/app-api/database/tables/${CHECKLISTS_TABLE}/delete`, {
      where: { id, business_id: businessId },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async createItem(data: CreateProjectTaskChecklistItemDto): Promise<ProjectTaskChecklistItem> {
    const checklist = await assertChecklistScope(data.checklist_id, data.business_id);
    if (Number(checklist.project_id) !== data.project_id) {
      throw new Error('Checklist must belong to this project');
    }
    const response = await skaftinClient.post(`/app-api/database/tables/${ITEMS_TABLE}/insert`, {
      data: {
        business_id: data.business_id,
        project_id: data.project_id,
        checklist_id: data.checklist_id,
        label: data.label.trim(),
        is_done: data.is_done ?? false,
        position: data.position ?? 0,
      },
    });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeItem(inserted as Record<string, unknown>);
  }

  static async updateItem(
    id: number,
    businessId: number,
    data: UpdateProjectTaskChecklistItemDto
  ): Promise<{ rowCount: number }> {
    const response = await skaftinClient.put(`/app-api/database/tables/${ITEMS_TABLE}/update`, {
      where: { id, business_id: businessId },
      data: {
        ...data,
        ...(data.label != null ? { label: data.label.trim() } : {}),
      },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async deleteItem(id: number, businessId: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(`/app-api/database/tables/${ITEMS_TABLE}/delete`, {
      where: { id, business_id: businessId },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default TaskChecklistService;
