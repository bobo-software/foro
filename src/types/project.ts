export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'cancelled' | string;

export interface Project {
  id?: number;
  business_id?: number | null;
  company_id: number;
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  starts_on?: string;
  ends_on?: string;
  /** Planned hours cap (Phase 7); nullable in DB */
  budget_hours?: number | null;
  /** Planned budget amount in company currency (Phase 7); nullable in DB */
  budget_amount?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProjectDto {
  business_id?: number | null;
  company_id: number;
  name: string;
  code?: string;
  description?: string;
  status?: ProjectStatus;
  starts_on?: string;
  ends_on?: string;
  budget_hours?: number | null;
  budget_amount?: number | null;
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  id: number;
}

