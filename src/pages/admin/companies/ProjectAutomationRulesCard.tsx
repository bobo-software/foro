import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AutomationRuleService from '@/services/automationRuleService';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import type { AutomationRule } from '@/types/automationRule';
import { automationRuleCreateSchema } from '@/validation/schemas';

const TRIGGER_OPTIONS = [
  { value: 'task_status_done', label: 'When task becomes done' },
  { value: 'task_status_changed', label: 'When task status changes' },
  { value: 'task_created', label: 'When task is created' },
  { value: 'manual_noop', label: 'Manual / placeholder (no runner yet)' },
] as const;

const DEFINITION_PRESETS: Record<string, string> = {
  task_status_done: '{"action":"toast","message":"Marked done — notify PM"}',
  task_status_changed: '{"action":"toast","message":"Status updated"}',
  task_created: '{"action":"toast","message":"New task logged"}',
  manual_noop: '{}',
};

export function ProjectAutomationRulesCard({ projectId, businessId }: { projectId: number; businessId: number }) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [triggerKey, setTriggerKey] = useState<string>(TRIGGER_OPTIONS[0].value);
  const [definitionJson, setDefinitionJson] = useState(DEFINITION_PRESETS.task_status_done);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRules(await AutomationRuleService.findByProject(projectId, businessId));
    } catch {
      setRules([]);
      toast.error('Could not load automation rules');
    } finally {
      setLoading(false);
    }
  }, [projectId, businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTriggerChange = useCallback((key: string) => {
    setTriggerKey(key);
    const preset = DEFINITION_PRESETS[key];
    if (preset != null) setDefinitionJson(preset);
  }, []);

  const addRule = useCallback(async () => {
    let definition: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(definitionJson || '{}') as unknown;
      if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        definition = parsed as Record<string, unknown>;
      } else {
        throw new Error('Definition must be a JSON object');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Invalid JSON in definition');
      return;
    }
    const parsed = automationRuleCreateSchema.safeParse({
      business_id: businessId,
      project_id: projectId,
      name: name.trim(),
      trigger_key: triggerKey,
      definition,
      enabled: true,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((i) => i.message).join('; '));
      return;
    }
    setBusy(true);
    try {
      await AutomationRuleService.create(parsed.data);
      setName('');
      setDefinitionJson(DEFINITION_PRESETS[triggerKey] ?? '{}');
      toast.success('Rule saved');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save rule');
    } finally {
      setBusy(false);
    }
  }, [name, triggerKey, definitionJson, businessId, projectId, load]);

  const toggle = useCallback(
    async (r: AutomationRule) => {
      if (r.id == null) return;
      setBusy(true);
      try {
        await AutomationRuleService.update(r.id, businessId, {
          enabled: !r.enabled,
          updated_at: new Date().toISOString(),
        });
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not update');
      } finally {
        setBusy(false);
      }
    },
    [businessId, load]
  );

  const remove = useCallback(
    async (id: number) => {
      if (!window.confirm('Delete this automation rule?')) return;
      setBusy(true);
      try {
        await AutomationRuleService.delete(id, businessId);
        await load();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not delete');
      } finally {
        setBusy(false);
      }
    },
    [businessId, load]
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Automation rules</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Rules run in the browser today when you save tasks (toast only). Email, webhooks, and cron need backend work — see{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">BACKEND-WISHLIST-SKAFTIN.md</code>.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-500">
        <span className="font-medium text-slate-600 dark:text-slate-400">Active triggers:</span>{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">task_status_done</code>,{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">task_status_changed</code>,{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">task_created</code> with{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">action: &quot;toast&quot;</code> and a{' '}
        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">message</code> string.
      </p>
      <div className="space-y-2 rounded-lg border border-slate-100 dark:border-slate-700 p-3">
        <AppInputLabeled
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Notify PM when done"
        />
        <AppLabeledSelectInput
          label="Trigger"
          value={triggerKey}
          onChange={(e) => onTriggerChange(e.target.value)}
          options={[...TRIGGER_OPTIONS]}
        />
        <AppLabeledAreaInput
          label="Definition (JSON object)"
          value={definitionJson}
          onChange={(e) => setDefinitionJson(e.target.value)}
          rows={3}
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => void addRule()}
          className="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add rule
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No rules for this project.</p>
      ) : (
        <ul className="text-sm space-y-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.name}</span>
                <span className="text-xs text-slate-500 ml-2">{r.trigger_key}</span>
                <span className={`text-xs ml-2 ${r.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {r.enabled ? 'On' : 'Off'}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || r.id == null}
                  onClick={() => void toggle(r)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                >
                  {r.enabled ? 'Disable' : 'Enable'}
                </button>
                {r.id != null && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(r.id!)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
