/**
 * Row in `project_time_entries`.
 * @see docs/03-database/project-time-entries-schema-contract.md
 */
export interface ProjectTimeEntry {
  id?: number;
  business_id: number;
  project_id: number;
  task_id?: number | null;
  user_id: number;
  logged_at?: string;
  duration_minutes: number;
  billable?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectTimeEntryDto {
  business_id: number;
  project_id: number;
  task_id?: number | null;
  user_id: number;
  logged_at?: string;
  duration_minutes: number;
  billable?: boolean;
  notes?: string | null;
}
