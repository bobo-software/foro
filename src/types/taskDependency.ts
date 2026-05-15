/**
 * Row in `project_task_dependencies`.
 * @see docs/03-database/project-task-dependencies-schema-contract.md
 */
export interface ProjectTaskDependency {
  id?: number;
  business_id: number;
  project_id: number;
  predecessor_task_id: number;
  successor_task_id: number;
  created_at?: string;
}

export interface CreateProjectTaskDependencyDto {
  business_id: number;
  project_id: number;
  predecessor_task_id: number;
  successor_task_id: number;
}
