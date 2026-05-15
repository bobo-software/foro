import toast from 'react-hot-toast';
import type { AutomationRule } from '../types/automationRule';
import AutomationRuleService from './automationRuleService';

function collectToastMessagesForTrigger(rules: AutomationRule[], triggerKey: string): string[] {
  const out: string[] = [];
  for (const r of rules) {
    if (!r.enabled || r.trigger_key !== triggerKey) continue;
    if (r.definition?.action !== 'toast') continue;
    const msg = r.definition?.message;
    if (typeof msg === 'string' && msg.trim()) out.push(msg.trim());
  }
  return out;
}

/** Messages from enabled `task_status_done` rules that request a toast. */
export function collectTaskDoneToastMessages(rules: AutomationRule[]): string[] {
  return collectToastMessagesForTrigger(rules, 'task_status_done');
}

/** Messages from enabled `task_created` rules that request a toast. */
export function collectTaskCreatedToastMessages(rules: AutomationRule[]): string[] {
  return collectToastMessagesForTrigger(rules, 'task_created');
}

/** Messages from enabled `task_status_changed` rules that request a toast. */
export function collectTaskStatusChangedToastMessages(rules: AutomationRule[]): string[] {
  return collectToastMessagesForTrigger(rules, 'task_status_changed');
}

/**
 * When a task transitions to **done**, run matching automation rules (MVP: toast only).
 * See project detail automation card for `definition` shape.
 */
export async function notifyTaskMarkedDoneAutomation(params: {
  businessId: number;
  projectId: number;
  previousStatus: string;
  newStatus: string;
}): Promise<void> {
  if (params.newStatus !== 'done' || params.previousStatus === 'done') return;
  const rules = await AutomationRuleService.findByProject(params.projectId, params.businessId);
  for (const msg of collectTaskDoneToastMessages(rules)) {
    toast.success(msg);
  }
}

/**
 * After a task is **created**, run matching automation rules (MVP: toast only).
 */
export async function notifyTaskCreatedAutomation(params: {
  businessId: number;
  projectId: number;
}): Promise<void> {
  const rules = await AutomationRuleService.findByProject(params.projectId, params.businessId);
  for (const msg of collectTaskCreatedToastMessages(rules)) {
    toast.success(msg);
  }
}

/**
 * When a task **status** changes (any transition), run matching rules (MVP: toast only).
 * Runs in addition to `task_status_done` when the new status is `done`.
 */
export async function notifyTaskStatusChangedAutomation(params: {
  businessId: number;
  projectId: number;
  previousStatus: string;
  newStatus: string;
}): Promise<void> {
  if (params.previousStatus === params.newStatus) return;
  const rules = await AutomationRuleService.findByProject(params.projectId, params.businessId);
  for (const msg of collectTaskStatusChangedToastMessages(rules)) {
    toast.success(msg);
  }
}
