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
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  id: number;
}

