import { foroApiClient } from '../backend';
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

const CHECKLISTS_BASE = '/api/v1/project-task-checklists';
const ITEMS_BASE = '/api/v1/project-task-checklist-items';

interface ApiChecklistRow {
  id: number;
  businessId: number;
  projectId: number;
  taskId: number;
  title: string;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiItemRow {
  id: number;
  businessId: number;
  projectId: number;
  checklistId: number;
  label: string;
  isDone: boolean;
  position: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApiChecklist(row: ApiChecklistRow): ProjectTaskChecklist {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    task_id: row.taskId,
    title: row.title,
    position: row.position ?? 0,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function fromApiItem(row: ApiItemRow): ProjectTaskChecklistItem {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    checklist_id: row.checklistId,
    label: row.label,
    is_done: Boolean(row.isDone),
    position: row.position ?? 0,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

async function assertTaskScope(taskId: number, businessId: number, projectId: number): Promise<void> {
  const task = await TaskService.findById(taskId);
  if (!task) throw new Error('Task not found');
  if (Number(task.business_id) !== businessId || Number(task.project_id) !== projectId) {
    throw new Error('Task must belong to this business and project');
  }
}

async function assertChecklistScope(checklistId: number, businessId: number): Promise<ProjectTaskChecklist> {
  const response = await foroApiClient.get<ApiChecklistRow>(`${CHECKLISTS_BASE}/${checklistId}`);
  if (!response.data || response.data.businessId !== businessId) {
    throw new Error('Checklist not found');
  }
  return fromApiChecklist(response.data);
}

export class TaskChecklistService {
  static async findByTask(taskId: number, businessId: number): Promise<ProjectTaskChecklistWithItems[]> {
    const response = await foroApiClient.get<ApiChecklistRow[]>(CHECKLISTS_BASE, {
      taskId,
      businessId,
      limit: 100,
    });
    const checklists = (response.data ?? [])
      .map(fromApiChecklist)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
  static async ensureChecklistForTask(taskId: number, businessId: number, projectId: number): Promise<number> {
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

  static async findItemsByChecklist(checklistId: number, businessId: number): Promise<ProjectTaskChecklistItem[]> {
    const response = await foroApiClient.get<ApiItemRow[]>(ITEMS_BASE, {
      checklistId,
      businessId,
      limit: 500,
    });
    return (response.data ?? [])
      .map(fromApiItem)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  static async createChecklist(data: CreateProjectTaskChecklistDto): Promise<ProjectTaskChecklist> {
    await assertTaskScope(data.task_id, data.business_id, data.project_id);
    const response = await foroApiClient.post<ApiChecklistRow>(CHECKLISTS_BASE, {
      businessId: data.business_id,
      projectId: data.project_id,
      taskId: data.task_id,
      title: data.title.trim(),
      position: data.position ?? 0,
    });
    return fromApiChecklist(response.data);
  }

  static async updateChecklist(
    id: number,
    businessId: number,
    data: UpdateProjectTaskChecklistDto
  ): Promise<{ rowCount: number }> {
    await assertChecklistScope(id, businessId);
    const payload: Record<string, unknown> = {};
    if (data.title != null) payload.title = data.title.trim();
    if (data.position !== undefined) payload.position = data.position;
    const response = await foroApiClient.put<ApiChecklistRow>(`${CHECKLISTS_BASE}/${id}`, payload);
    return { rowCount: response.data ? 1 : 0 };
  }

  static async deleteChecklist(id: number, businessId: number): Promise<{ rowCount: number }> {
    await assertChecklistScope(id, businessId);
    await foroApiClient.delete(`${CHECKLISTS_BASE}/${id}`);
    return { rowCount: 1 };
  }

  static async createItem(data: CreateProjectTaskChecklistItemDto): Promise<ProjectTaskChecklistItem> {
    const checklist = await assertChecklistScope(data.checklist_id, data.business_id);
    if (Number(checklist.project_id) !== data.project_id) {
      throw new Error('Checklist must belong to this project');
    }
    const response = await foroApiClient.post<ApiItemRow>(ITEMS_BASE, {
      businessId: data.business_id,
      projectId: data.project_id,
      checklistId: data.checklist_id,
      label: data.label.trim(),
      isDone: data.is_done ?? false,
      position: data.position ?? 0,
    });
    return fromApiItem(response.data);
  }

  static async updateItem(
    id: number,
    businessId: number,
    data: UpdateProjectTaskChecklistItemDto
  ): Promise<{ rowCount: number }> {
    const payload: Record<string, unknown> = {};
    if (data.label != null) payload.label = data.label.trim();
    if (data.is_done !== undefined) payload.isDone = data.is_done;
    if (data.position !== undefined) payload.position = data.position;
    const response = await foroApiClient.put<ApiItemRow>(`${ITEMS_BASE}/${id}`, payload);
    void businessId; // server-side authorization scopes this via team_memberships; kept for signature compat
    return { rowCount: response.data ? 1 : 0 };
  }

  static async deleteItem(id: number, businessId: number): Promise<{ rowCount: number }> {
    void businessId;
    await foroApiClient.delete(`${ITEMS_BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default TaskChecklistService;
