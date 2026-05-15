/**
 * Row in `automation_rules`.
 * @see docs/03-database/automation-rules-schema-contract.md
 */
export interface AutomationRule {
  id?: number;
  business_id: number;
  project_id: number | null;
  name: string;
  trigger_key: string;
  definition: Record<string, unknown>;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateAutomationRuleDto {
  business_id: number;
  project_id: number | null;
  name: string;
  trigger_key: string;
  definition?: Record<string, unknown>;
  enabled?: boolean;
}
