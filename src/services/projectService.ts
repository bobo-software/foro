import { skaftinClient } from '../backend';
import type { Project, CreateProjectDto } from '../types/project';

const TABLE_NAME = 'projects';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeProject(raw: Record<string, unknown>): Project {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: raw.business_id != null ? Number(raw.business_id) : undefined,
    company_id: Number(raw.company_id),
  } as Project;
}

export class ProjectService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 5000,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    return rows.map((row) => normalizeProject(row));
  }

  static async findById(id: number): Promise<Project | null> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { where: { id }, limit: 1, offset: 0 }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    const project = rows[0] ?? null;
    return project ? normalizeProject(project) : null;
  }

  static async create(data: CreateProjectDto): Promise<Project> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data }
    );
    const r = response as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeProject(inserted as Record<string, unknown>);
  }

  static async update(id: number, data: Partial<CreateProjectDto>): Promise<{ rowCount: number }> {
    const response = await skaftinClient.put(
      `/app-api/database/tables/${TABLE_NAME}/update`,
      { where: { id }, data }
    );
    const r = response as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(
      `/app-api/database/tables/${TABLE_NAME}/delete`,
      { where: { id } }
    );
    const r = response as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default ProjectService;

