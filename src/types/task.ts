/** Matches DB CHECK on project_tasks.status */
export type ProjectTaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | string;

/** Matches DB CHECK on project_tasks.priority (nullable) */
export type ProjectTaskPriority = 'low' | 'normal' | 'high' | 'urgent' | string;

/**
 * Row in `project_tasks`. `business_id` has no DB FK; must match the parent project tenant in app logic.
 * @see docs/03-database/project-tasks-schema-contract.md
 */
export interface ProjectTask {
  id?: number;
  business_id: number;
  project_id: number;
  title: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority | null;
  due_on?: string | null;
  assigned_to_user_id?: number | null;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectTaskDto {
  business_id: number;
  project_id: number;
  title: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority | null;
  due_on?: string | null;
  assigned_to_user_id?: number | null;
  position?: number;
}

export interface UpdateProjectTaskDto extends Partial<Omit<CreateProjectTaskDto, 'project_id' | 'business_id'>> {
  id: number;
}
