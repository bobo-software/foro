import { skaftinClient } from '../backend';
import type { AutomationRule, CreateAutomationRuleDto } from '../types/automationRule';

const TABLE_NAME = 'automation_rules';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function asDefinition(raw: unknown): Record<string, unknown> {
  if (raw != null && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function normalizeRule(raw: Record<string, unknown>): AutomationRule {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    project_id: raw.project_id != null ? Number(raw.project_id) : null,
    name: String(raw.name ?? ''),
    trigger_key: String(raw.trigger_key ?? ''),
    definition: asDefinition(raw.definition),
    enabled: raw.enabled === false ? false : true,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  };
}

export class AutomationRuleService {
  static async findByProject(projectId: number, businessId: number): Promise<AutomationRule[]> {
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/select`, {
      where: { project_id: projectId, business_id: businessId },
      orderBy: 'id',
      orderDirection: 'DESC',
      limit: 500,
      offset: 0,
    });
    return normalizeRows<Record<string, unknown>>(response).map((row) => normalizeRule(row));
  }

  static async create(data: CreateAutomationRuleDto): Promise<AutomationRule> {
    const row = {
      business_id: data.business_id,
      project_id: data.project_id,
      name: data.name,
      trigger_key: data.trigger_key,
      definition: data.definition ?? {},
      enabled: data.enabled ?? true,
    };
    const response = await skaftinClient.post(`/app-api/database/tables/${TABLE_NAME}/insert`, { data: row });
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeRule(inserted as Record<string, unknown>);
  }

  static async update(
    id: number,
    businessId: number,
    data: Partial<Pick<AutomationRule, 'name' | 'trigger_key' | 'definition' | 'enabled'>> & { updated_at?: string }
  ): Promise<{ rowCount: number }> {
    const response = await skaftinClient.put(`/app-api/database/tables/${TABLE_NAME}/update`, {
      where: { id, business_id: businessId },
      data,
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }

  static async delete(id: number, businessId: number): Promise<{ rowCount: number }> {
    const response = await skaftinClient.delete(`/app-api/database/tables/${TABLE_NAME}/delete`, {
      where: { id, business_id: businessId },
    });
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default AutomationRuleService;
