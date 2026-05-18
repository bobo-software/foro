/**
 * Task checklists and items.
 * @see docs/03-database/project-task-checklists-schema-contract.md
 */

export interface ProjectTaskChecklist {
  id?: number;
  business_id: number;
  project_id: number;
  task_id: number;
  title: string;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTaskChecklistItem {
  id?: number;
  business_id: number;
  project_id: number;
  checklist_id: number;
  label: string;
  is_done: boolean;
  position?: number;
  created_at?: string;
  updated_at?: string;
}

export type ProjectTaskChecklistWithItems = ProjectTaskChecklist & {
  items: ProjectTaskChecklistItem[];
};

export interface CreateProjectTaskChecklistDto {
  business_id: number;
  project_id: number;
  task_id: number;
  title: string;
  position?: number;
}

export interface UpdateProjectTaskChecklistDto {
  title?: string;
  position?: number;
  updated_at?: string;
}

export interface CreateProjectTaskChecklistItemDto {
  business_id: number;
  project_id: number;
  checklist_id: number;
  label: string;
  is_done?: boolean;
  position?: number;
}

export interface UpdateProjectTaskChecklistItemDto {
  label?: string;
  is_done?: boolean;
  position?: number;
  updated_at?: string;
}
