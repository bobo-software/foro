import { foroApiClient } from '../backend';
import type { Project, CreateProjectDto } from '../types/project';

const BASE = '/api/v1/projects';

interface ApiProjectRow {
  id: number;
  businessId: number | null;
  companyId: number;
  name: string;
  code: string | null;
  description: string | null;
  status: string | null;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  budgetHours: string | null;
  budgetAmount: string | null;
}

function fromApi(row: ApiProjectRow): Project {
  return {
    id: row.id,
    business_id: row.businessId,
    company_id: row.companyId,
    name: row.name,
    code: row.code ?? undefined,
    description: row.description ?? undefined,
    status: row.status ?? undefined,
    starts_on: row.startsOn ?? undefined,
    ends_on: row.endsOn ?? undefined,
    budget_hours: row.budgetHours != null ? Number(row.budgetHours) : undefined,
    budget_amount: row.budgetAmount != null ? Number(row.budgetAmount) : undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

/**
 * NOTE: foro-api requires `businessId` in the POST body (API-layer validation,
 * even though the DB column is nullable) since it's the tenant boundary used for
 * authorization. `CreateProjectDto.business_id` is optional/nullable here for
 * backward compatibility — if a caller omits it, the API will reject the request
 * with a 400. Existing callers should already be passing it (see companyService's
 * `is_owner_company` companies, whose id IS the business id).
 */
function toApiBody(data: Partial<CreateProjectDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.name !== undefined) body.name = data.name;
  if (data.code !== undefined) body.code = data.code;
  if (data.description !== undefined) body.description = data.description;
  if (data.status !== undefined) body.status = data.status;
  if (data.starts_on !== undefined) body.startsOn = data.starts_on;
  if (data.ends_on !== undefined) body.endsOn = data.ends_on;
  if (data.budget_hours !== undefined) body.budgetHours = data.budget_hours;
  if (data.budget_amount !== undefined) body.budgetAmount = data.budget_amount;
  return body;
}

export class ProjectService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiProjectRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...(where.status !== undefined && { status: where.status }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Project;
      rows = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      });
    }
    return rows;
  }

  static async findById(id: number): Promise<Project | null> {
    try {
      const response = await foroApiClient.get<ApiProjectRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateProjectDto): Promise<Project> {
    const response = await foroApiClient.post<ApiProjectRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateProjectDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiProjectRow>(`${BASE}/${id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default ProjectService;
