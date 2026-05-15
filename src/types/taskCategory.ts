export interface TaskCategory {
  id?: number;
  business_id: number;
  project_id: number;
  name: string;
  slug: string;
  color?: string | null;
  position: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateTaskCategoryDto {
  business_id: number;
  project_id: number;
  name: string;
  slug: string;
  color?: string | null;
  position?: number;
}

export const DEFAULT_TASK_CATEGORIES: Array<{ name: string; slug: string; color: string }> = [
  { name: 'To Do',       slug: 'todo',        color: '#94a3b8' },
  { name: 'In Progress', slug: 'in_progress', color: '#3b82f6' },
  { name: 'Review',      slug: 'review',      color: '#8b5cf6' },
  { name: 'Blocked',     slug: 'blocked',     color: '#ef4444' },
  { name: 'Done',        slug: 'done',        color: '#10b981' },
];
