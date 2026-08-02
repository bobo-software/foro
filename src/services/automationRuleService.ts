import { foroApiClient } from '../backend';
import type { AutomationRule, CreateAutomationRuleDto } from '../types/automationRule';

const BASE = '/api/v1/automation-rules';

interface ApiRow {
  id: number;
  businessId: number;
  projectId: number | null;
  name: string;
  triggerKey: string;
  definition: Record<string, unknown>;
  enabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): AutomationRule {
  return {
    id: row.id,
    business_id: row.businessId,
    project_id: row.projectId,
    name: row.name,
    trigger_key: row.triggerKey,
    definition: row.definition ?? {},
    enabled: row.enabled === false ? false : true,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

export class AutomationRuleService {
  static async findByProject(projectId: number, businessId: number): Promise<AutomationRule[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      projectId,
      businessId,
      limit: 500,
    });
    return (response.data ?? []).map(fromApi).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  }

  static async create(data: CreateAutomationRuleDto): Promise<AutomationRule> {
    const response = await foroApiClient.post<ApiRow>(BASE, {
      businessId: data.business_id,
      projectId: data.project_id,
      name: data.name,
      triggerKey: data.trigger_key,
      definition: data.definition ?? {},
      enabled: data.enabled ?? true,
    });
    return fromApi(response.data);
  }

  static async update(
    id: number,
    businessId: number,
    data: Partial<Pick<AutomationRule, 'name' | 'trigger_key' | 'definition' | 'enabled'>> & { updated_at?: string }
  ): Promise<{ rowCount: number }> {
    void businessId;
    const body: Record<string, unknown> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.trigger_key !== undefined) body.triggerKey = data.trigger_key;
    if (data.definition !== undefined) body.definition = data.definition;
    if (data.enabled !== undefined) body.enabled = data.enabled;
    const response = await foroApiClient.put<ApiRow>(`${BASE}/${id}`, body);
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number, businessId: number): Promise<{ rowCount: number }> {
    void businessId;
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default AutomationRuleService;
