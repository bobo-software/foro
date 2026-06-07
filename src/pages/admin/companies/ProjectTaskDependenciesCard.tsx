import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import TaskDependencyService from '@/services/taskDependencyService';
import type { ProjectTask } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import { projectTaskDependencyCreateSchema } from '@/validation/schemas';
import { withIds } from '@/utils/withIds';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';

export function ProjectTaskDependenciesCard({
  projectId,
  businessId,
  tasks,
  dependencies,
  onChanged,
}: {
  projectId: number;
  businessId: number;
  tasks: ProjectTask[];
  dependencies: ProjectTaskDependency[];
  onChanged: () => void;
}) {
  const [pred, setPred] = useState('');
  const [succ, setSucc] = useState('');
  const [busy, setBusy] = useState(false);

  const taskOptions = useMemo(
    () => withIds(tasks).sort((a, b) => (a.title || '').localeCompare(b.title || '')),
    [tasks]
  );

  const titleById = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tasks) {
      if (t.id != null) m.set(t.id, t.title || `Task #${t.id}`);
    }
    return m;
  }, [tasks]);

  const addEdge = useCallback(async () => {
    const pi = Number(pred);
    const si = Number(succ);
    const parsed = projectTaskDependencyCreateSchema.safeParse({
      business_id: businessId,
      project_id: projectId,
      predecessor_task_id: pi,
      successor_task_id: si,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((i) => i.message).join('; '));
      return;
    }
    setBusy(true);
    try {
      await TaskDependencyService.create(parsed.data);
      setPred('');
      setSucc('');
      toast.success('Dependency added');
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add dependency');
    } finally {
      setBusy(false);
    }
  }, [pred, succ, businessId, projectId, onChanged]);

  const remove = useCallback(
    async (id: number) => {
      if (!window.confirm('Remove this dependency?')) return;
      setBusy(true);
      try {
        await TaskDependencyService.delete(id, businessId);
        toast.success('Removed');
        onChanged();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not remove');
      } finally {
        setBusy(false);
      }
    },
    [businessId, onChanged]
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task dependencies</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Predecessor must complete before successor in planning order. Shown on the Timeline view as “After …”.
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[10rem]">
          <AppLabeledSelectInput
            label="Predecessor"
            value={pred}
            onChange={(e) => setPred(e.target.value)}
            options={taskOptions.map((t) => ({ value: String(t.id), label: t.title || `Task #${t.id}` }))}
            placeholder="Select task…"
          />
        </div>
        <span className="text-xs text-slate-500 pb-2">→</span>
        <div className="min-w-[10rem]">
          <AppLabeledSelectInput
            label="Successor"
            value={succ}
            onChange={(e) => setSucc(e.target.value)}
            options={taskOptions.map((t) => ({ value: String(t.id), label: t.title || `Task #${t.id}` }))}
            placeholder="Select task…"
          />
        </div>
        <button
          type="button"
          disabled={busy || !pred || !succ}
          onClick={() => void addEdge()}
          className="min-h-10 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {dependencies.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No dependencies yet.</p>
      ) : (
        <ul className="text-sm space-y-1 border-t border-slate-100 dark:border-slate-700 pt-3">
          {dependencies.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-700 dark:text-slate-200">
                <span className="font-medium">{titleById.get(d.predecessor_task_id) ?? `#${d.predecessor_task_id}`}</span>
                <span className="text-slate-500 mx-1">→</span>
                <span className="font-medium">{titleById.get(d.successor_task_id) ?? `#${d.successor_task_id}`}</span>
              </span>
              {d.id != null && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove(d.id)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
