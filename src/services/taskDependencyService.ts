import { foroApiClient } from '../backend';
import type { CreateProjectTaskDependencyDto, ProjectTaskDependency } from '../types/taskDependency';
import TaskService from './taskService';

const BASE = '/api/v1/project-task-dependencies';

interface ApiRow {
  id: number;
  businessId: number;
  projectId: number;
  predecessorTaskId: number;
  successorTaskId: number;
  createdAt: string | null;
}

function fromApi(row: ApiRow): ProjectTaskDependency {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    predecessor_task_id: row.predecessorTaskId,
    successor_task_id: row.successorTaskId,
    created_at: row.createdAt ?? undefined,
  };
}

export class TaskDependencyService {
  static async findByProject(projectId: number, businessId: number): Promise<ProjectTaskDependency[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      projectId,
      businessId,
      limit: 2000,
    });
    return (response.data ?? []).map(fromApi).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
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
    const response = await foroApiClient.post<ApiRow>(BASE, {
      businessId: data.business_id,
      projectId: data.project_id,
      predecessorTaskId: data.predecessor_task_id,
      successorTaskId: data.successor_task_id,
    });
    return fromApi(response.data);
  }

  static async delete(id: number, businessId: number): Promise<{ rowCount: number }> {
    void businessId;
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default TaskDependencyService;
