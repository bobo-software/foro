import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader, NewTaskModal, EditTaskModal } from '@/components/ComponentsIndex';
import { ManageCategoriesModal } from '@/components/modals/ManageCategoriesModal';
import { LuPlus, LuCircleDot, LuCircleCheck, LuCircleAlert, LuSettings2 } from 'react-icons/lu';
import TaskCategoryService from '@/services/taskCategoryService';
import type { TaskCategory } from '@/types/taskCategory';
import CompanyService from '@/services/companyService';
import ProjectService from '@/services/projectService';
import TaskService from '@/services/taskService';
import TaskDependencyService from '@/services/taskDependencyService';
import {
  notifyTaskMarkedDoneAutomation,
  notifyTaskCreatedAutomation,
  notifyTaskStatusChangedAutomation,
} from '@/services/automationTriggerRunner';
import TimeEntryService from '@/services/timeEntryService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import useAuthStore from '@/stores/data/AuthStore';
import type { Company } from '@/types/company';
import type { Project } from '@/types/project';
import type { ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '@/types/task';
import type { ProjectTaskDependency } from '@/types/taskDependency';
import { useTeamStore } from '@/stores/data/TeamStore';
import {
  projectSchema,
  projectTaskCreateSchema,
  projectTaskUpdateSchema,
  projectTimeEntryCreateSchema,
} from '@/validation/schemas';
import { isAssignableUserId } from '@/utils/projectTaskAssignee';
import type { KanbanPositionUpdate } from '@/utils/projectKanbanReorder';
import { escapeIlikePattern } from '@/utils/sqlLikePattern';
import { buildCsvLines, downloadCsvFile } from '@/utils/csvDownload';
import { buildProjectTimelineCsv } from '@/utils/projectTimelineCsv';
import type { ProjectTimeEntry } from '@/types/timeEntry';
import { ProjectTasksKanban } from './ProjectTasksKanban';
import { ProjectTasksTimeline } from './ProjectTasksTimeline';
import { ProjectTaskDependenciesCard } from './ProjectTaskDependenciesCard';
import { ProjectPortalInvitesCard } from './ProjectPortalInvitesCard';
import { ProjectAutomationRulesCard } from './ProjectAutomationRulesCard';
import { ProjectInsightsCard } from './ProjectInsightsCard';

type TaskDraft = {
  title: string;
  status: ProjectTaskStatus;
  due_on: string;
  assigned_to_user_id: number | null;
  description: string;
  /** Empty string means null priority in API */
  priority: '' | ProjectTaskPriority;
};

const TASK_PAGE_SIZE = 50;
const TIME_ENTRY_PAGE_SIZE = 50;

function timerStorageKey(projectId: number, businessId: number): string {
  return `foro_project_timer_v1_${projectId}_${businessId}`;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const PRIORITY_OPTIONS: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];

function mergeTasksById(prev: ProjectTask[], more: ProjectTask[]): ProjectTask[] {
  const seen = new Set(prev.map((t) => t.id));
  const out = [...prev];
  for (const t of more) {
    if (t.id != null && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

function mergeTimeEntriesById(prev: ProjectTimeEntry[], more: ProjectTimeEntry[]): ProjectTimeEntry[] {
  const seen = new Set(
    prev.map((e) => e.id).filter((id): id is number => id != null)
  );
  const out = [...prev];
  for (const e of more) {
    if (e.id != null) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
    }
    out.push(e);
  }
  return out;
}

function taskRowToDraft(t: ProjectTask): TaskDraft {
  const p = t.priority;
  const priority: TaskDraft['priority'] =
    p === 'low' || p === 'normal' || p === 'high' || p === 'urgent' ? p : '';
  return {
    title: t.title,
    status: (t.status ?? 'todo') as ProjectTaskStatus,
    due_on: t.due_on?.slice(0, 10) ?? '',
    assigned_to_user_id: t.assigned_to_user_id != null ? Number(t.assigned_to_user_id) : null,
    description: t.description != null ? String(t.description) : '',
    priority,
  };
}

type TaskViewMode = 'list' | 'timeline';
type PageTab = 'kanban' | 'details';

const VIEW_STORAGE_PREFIX = 'foro_project_tasks_view_';

const STATUS_OPTIONS: ProjectTaskStatus[] = ['todo', 'in_progress', 'review', 'blocked', 'done'];

function statusOptionLabel(s: ProjectTaskStatus): string {
  return String(s)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function effectiveBusinessId(project: Project | null, storeId: number | undefined): number | null {
  const fromProject = project?.business_id != null ? Number(project.business_id) : NaN;
  if (!Number.isNaN(fromProject) && fromProject > 0) return fromProject;
  const fromStore = storeId != null ? Number(storeId) : NaN;
  if (!Number.isNaN(fromStore) && fromStore > 0) return fromStore;
  return null;
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id: companyIdParam, projectId: projectIdParam } = useParams<{ id: string; projectId: string }>();
  const storeBusinessId = useBusinessStore((s) => s.currentBusiness?.id);
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const teamMembers = useTeamStore((s) => s.members);
  const fetchTeamMembers = useTeamStore((s) => s.fetchMembers);

  const companyId = companyIdParam != null ? Number(companyIdParam) : NaN;
  const projectId = projectIdParam != null ? Number(projectIdParam) : NaN;

  const [company, setCompany] = useState<Company | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [taskDeps, setTaskDeps] = useState<ProjectTaskDependency[]>([]);
  const [drafts, setDrafts] = useState<Record<number, TaskDraft>>({});
  const [loading, setLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksLoadingMore, setTasksLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'' | 'low' | 'normal' | 'high' | 'urgent'>('');
  const [newDueOn, setNewDueOn] = useState('');
  const [newAssigneeUserId, setNewAssigneeUserId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [taskView, setTaskView] = useState<TaskViewMode>('list');
  const [pageTab, setPageTab] = useState<PageTab>('kanban');
  const [kanbanAddOpen, setKanbanAddOpen] = useState(false);
  const [editTask, setEditTask] = useState<ProjectTask | null>(null);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);
  /** List view only: empty string = all statuses (server does not filter by status) */
  const [listStatusFilter, setListStatusFilter] = useState<'' | ProjectTaskStatus>('');
  const [listTitleQuery, setListTitleQuery] = useState('');
  const [debouncedTitleQuery, setDebouncedTitleQuery] = useState('');
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const taskFetchOffsetRef = useRef(0);

  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntry[]>([]);
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);
  const [timeEntriesLoadingMore, setTimeEntriesLoadingMore] = useState(false);
  const [hasMoreTimeEntries, setHasMoreTimeEntries] = useState(false);
  const timeEntryFetchOffsetRef = useRef(0);
  const [logMinutes, setLogMinutes] = useState('');
  const [logBillable, setLogBillable] = useState(true);
  const [logTaskId, setLogTaskId] = useState<string>('');
  const [logNotes, setLogNotes] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  const [budgetHoursInput, setBudgetHoursInput] = useState('');
  const [budgetAmountInput, setBudgetAmountInput] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);

  const [billableRollup, setBillableRollup] = useState<{
    totalMinutes: number;
    entryCount: number;
    capped: boolean;
  } | null>(null);
  const [billableRollupLoading, setBillableRollupLoading] = useState(false);

  const [workTimerStartedAt, setWorkTimerStartedAt] = useState<number | null>(null);
  const [workTimerTick, setWorkTimerTick] = useState(0);
  const [timerSaving, setTimerSaving] = useState(false);
  const [timerBillable, setTimerBillable] = useState(true);

  const bid = useMemo(() => effectiveBusinessId(project, storeBusinessId), [project, storeBusinessId]);

  const loadTaskDeps = useCallback(async () => {
    if (project?.id == null || bid == null) return;
    try {
      setTaskDeps(await TaskDependencyService.findByProject(project.id, bid));
    } catch {
      setTaskDeps([]);
    }
  }, [project?.id, bid]);

  useEffect(() => {
    void loadTaskDeps();
  }, [loadTaskDeps]);

  const loadCategories = useCallback(async () => {
    if (project?.id == null || bid == null) return;
    try {
      const cats = await TaskCategoryService.findOrSeedByProject(project.id, bid);
      setCategories(cats);
    } catch {
      setCategories([]);
    }
  }, [project?.id, bid]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const activeTeamMembers = useMemo(
    () => teamMembers.filter((m) => m.status === 'active'),
    [teamMembers]
  );

  const listFiltersActive = listStatusFilter !== '' || listTitleQuery.trim() !== '';

  const loggedBillableMinutes = useMemo(
    () =>
      timeEntries
        .filter((e) => e.billable)
        .reduce((s, e) => s + (Number.isFinite(e.duration_minutes) ? e.duration_minutes : 0), 0),
    [timeEntries]
  );

  const loggedTotalMinutes = useMemo(
    () =>
      timeEntries.reduce(
        (s, e) => s + (Number.isFinite(e.duration_minutes) ? e.duration_minutes : 0),
        0
      ),
    [timeEntries]
  );

  const billableMinutesForBudget = useMemo(() => {
    if (billableRollup != null && !billableRollupLoading) {
      return billableRollup.totalMinutes;
    }
    return loggedBillableMinutes;
  }, [billableRollup, billableRollupLoading, loggedBillableMinutes]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedTitleQuery(listTitleQuery.trim()), 400);
    return () => window.clearTimeout(id);
  }, [listTitleQuery]);

  useEffect(() => {
    if (bid == null) return;
    void fetchTeamMembers(bid);
  }, [bid, fetchTeamMembers]);

  useEffect(() => {
    if (!Number.isFinite(projectId)) return;
    try {
      const raw = localStorage.getItem(`${VIEW_STORAGE_PREFIX}${projectId}`);
      if (raw === 'list' || raw === 'timeline') setTaskView(raw as TaskViewMode);
    } catch {
      /* ignore */
    }
  }, [projectId]);

  const setTaskViewPersisted = useCallback(
    (mode: TaskViewMode) => {
      setTaskView(mode);
      if (!Number.isFinite(projectId)) return;
      try {
        localStorage.setItem(`${VIEW_STORAGE_PREFIX}${projectId}`, mode);
      } catch {
        /* ignore */
      }
    },
    [projectId]
  );

  const loadTasks = useCallback(
    async (mode: 'reset' | 'append' = 'reset') => {
      if (project?.id == null || bid == null) return;
      if (mode === 'reset') {
        setTasksLoading(true);
      } else {
        setTasksLoadingMore(true);
      }
      setTaskError(null);
      try {
        const where: Record<string, unknown> = { project_id: project.id, business_id: bid };
        if (listStatusFilter !== '') {
          where.status = listStatusFilter;
        }
        const titleQ = debouncedTitleQuery.trim();
        if (titleQ.length > 0) {
          where.title = { ilike: `%${escapeIlikePattern(titleQ)}%` };
        }
        if (mode === 'reset') {
          taskFetchOffsetRef.current = 0;
        }
        const offset = taskFetchOffsetRef.current;
        const data = await TaskService.findAll({
          where,
          orderBy: 'position',
          orderDirection: 'ASC',
          limit: TASK_PAGE_SIZE,
          offset,
        });
        setHasMoreTasks(data.length === TASK_PAGE_SIZE);
        if (mode === 'append') {
          setTasks((prev) => mergeTasksById(prev, data));
          setDrafts((d) => {
            const next = { ...d };
            for (const t of data) {
              if (t.id == null) continue;
              if (!next[t.id]) next[t.id] = taskRowToDraft(t);
            }
            return next;
          });
          taskFetchOffsetRef.current += data.length;
        } else {
          setTasks(data);
          const d: Record<number, TaskDraft> = {};
          for (const t of data) {
            if (t.id == null) continue;
            d[t.id] = taskRowToDraft(t);
          }
          setDrafts(d);
          taskFetchOffsetRef.current = data.length;
        }
        await loadTaskDeps();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load tasks';
        setTaskError(msg);
        if (mode === 'reset') {
          setTasks([]);
          taskFetchOffsetRef.current = 0;
          setHasMoreTasks(false);
        }
      } finally {
        if (mode === 'reset') {
          setTasksLoading(false);
        } else {
          setTasksLoadingMore(false);
        }
      }
    },
    [project?.id, bid, listStatusFilter, debouncedTitleQuery, loadTaskDeps]
  );

  useEffect(() => {
    if (!Number.isFinite(companyId) || !Number.isFinite(projectId)) {
      setError('Invalid route');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([CompanyService.findById(companyId), ProjectService.findById(projectId)])
      .then(([co, pr]) => {
        if (cancelled) return;
        setCompany(co);
        setProject(pr);
        if (!pr) {
          setError('Project not found');
          return;
        }
        if (pr.company_id !== companyId) {
          setError('Project does not belong to this company');
          setProject(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, projectId]);

  useEffect(() => {
    if (!project?.id || bid == null) return;
    void loadTasks('reset');
  }, [project?.id, bid, listStatusFilter, debouncedTitleQuery, loadTasks]);

  const loadTimeEntries = useCallback(
    async (mode: 'reset' | 'append' = 'reset') => {
      if (project?.id == null || bid == null) return;
      if (mode === 'reset') {
        setTimeEntriesLoading(true);
      } else {
        setTimeEntriesLoadingMore(true);
      }
      try {
        if (mode === 'reset') {
          timeEntryFetchOffsetRef.current = 0;
        }
        const offset = timeEntryFetchOffsetRef.current;
        const rows = await TimeEntryService.findAll({
          where: { project_id: project.id, business_id: bid },
          orderBy: 'logged_at',
          orderDirection: 'DESC',
          limit: TIME_ENTRY_PAGE_SIZE,
          offset,
        });
        setHasMoreTimeEntries(rows.length === TIME_ENTRY_PAGE_SIZE);
        if (mode === 'append') {
          setTimeEntries((prev) => mergeTimeEntriesById(prev, rows));
          timeEntryFetchOffsetRef.current += rows.length;
        } else {
          setTimeEntries(rows);
          timeEntryFetchOffsetRef.current = rows.length;
        }
      } catch (e) {
        if (mode === 'reset') {
          setTimeEntries([]);
          timeEntryFetchOffsetRef.current = 0;
          setHasMoreTimeEntries(false);
        } else {
          toast.error(e instanceof Error ? e.message : 'Could not load more time entries');
        }
      } finally {
        if (mode === 'reset') {
          setTimeEntriesLoading(false);
        } else {
          setTimeEntriesLoadingMore(false);
        }
      }
    },
    [project?.id, bid]
  );

  useEffect(() => {
    void loadTimeEntries('reset');
  }, [loadTimeEntries]);

  const loadBillableRollup = useCallback(async () => {
    if (project?.id == null || bid == null) return;
    setBillableRollupLoading(true);
    try {
      const r = await TimeEntryService.sumBillableMinutesForProject({
        project_id: project.id,
        business_id: bid,
      });
      setBillableRollup(r);
    } catch {
      setBillableRollup(null);
    } finally {
      setBillableRollupLoading(false);
    }
  }, [project?.id, bid]);

  useEffect(() => {
    void loadBillableRollup();
  }, [loadBillableRollup]);

  useEffect(() => {
    if (project?.id == null || bid == null) {
      setWorkTimerStartedAt(null);
      return;
    }
    try {
      const raw = localStorage.getItem(timerStorageKey(project.id, bid));
      const started = raw != null ? Number(raw) : NaN;
      if (Number.isFinite(started) && started > 0 && started <= Date.now()) {
        setWorkTimerStartedAt(started);
        setWorkTimerTick(Date.now());
        return;
      }
    } catch {
      /* ignore */
    }
    setWorkTimerStartedAt(null);
  }, [project?.id, bid]);

  useEffect(() => {
    if (workTimerStartedAt == null) return;
    setWorkTimerTick(Date.now());
    const id = window.setInterval(() => setWorkTimerTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [workTimerStartedAt]);

  useEffect(() => {
    if (!project) return;
    setBudgetHoursInput(project.budget_hours != null ? String(project.budget_hours) : '');
    setBudgetAmountInput(project.budget_amount != null ? String(project.budget_amount) : '');
  }, [project?.id, project?.budget_hours, project?.budget_amount, project]);

  const handleSaveProjectBudgets = async () => {
    if (project?.id == null) return;
    const parsed = projectSchema.safeParse({
      company_id: project.company_id,
      name: project.name,
      budget_hours: budgetHoursInput.trim() === '' ? null : Number(budgetHoursInput),
      budget_amount: budgetAmountInput.trim() === '' ? null : Number(budgetAmountInput),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      toast.error(msg);
      return;
    }
    setBudgetSaving(true);
    try {
      await ProjectService.update(project.id, {
        budget_hours: parsed.data.budget_hours ?? null,
        budget_amount: parsed.data.budget_amount ?? null,
      });
      const refreshed = await ProjectService.findById(project.id);
      if (refreshed) setProject(refreshed);
      toast.success('Budgets saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save budgets');
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (project?.id == null || bid == null) return;
    const uid = sessionUser?.id != null ? Number(sessionUser.id) : NaN;
    if (!Number.isFinite(uid)) {
      toast.error('You must be signed in to log time');
      return;
    }
    const mins = Number(logMinutes);
    const taskIdOpt = logTaskId === '' ? undefined : Number(logTaskId);
    if (taskIdOpt != null && !Number.isFinite(taskIdOpt)) {
      toast.error('Invalid task');
      return;
    }
    const parsed = projectTimeEntryCreateSchema.safeParse({
      business_id: bid,
      project_id: project.id,
      user_id: uid,
      duration_minutes: mins,
      billable: logBillable,
      notes: logNotes.trim() || null,
      ...(taskIdOpt === undefined ? {} : { task_id: taskIdOpt }),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      toast.error(msg);
      return;
    }
    setLogSaving(true);
    try {
      await TimeEntryService.create(parsed.data);
      setLogMinutes('');
      setLogNotes('');
      setLogTaskId('');
      setLogBillable(true);
      await loadTimeEntries('reset');
      void loadBillableRollup();
      toast.success('Time logged');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not log time');
    } finally {
      setLogSaving(false);
    }
  };

  const clearWorkTimerStorage = useCallback(() => {
    if (project?.id == null || bid == null) return;
    try {
      localStorage.removeItem(timerStorageKey(project.id, bid));
    } catch {
      /* ignore */
    }
    setWorkTimerStartedAt(null);
  }, [project?.id, bid]);

  const handleWorkTimerStart = () => {
    if (project?.id == null || bid == null) return;
    if (workTimerStartedAt != null) return;
    const now = Date.now();
    setWorkTimerStartedAt(now);
    setWorkTimerTick(now);
    try {
      localStorage.setItem(timerStorageKey(project.id, bid), String(now));
    } catch {
      /* ignore */
    }
  };

  const handleWorkTimerDiscard = () => {
    clearWorkTimerStorage();
    toast.success('Timer cleared');
  };

  const handleWorkTimerStop = async () => {
    if (project?.id == null || bid == null || workTimerStartedAt == null) return;
    const uid = sessionUser?.id != null ? Number(sessionUser.id) : NaN;
    if (!Number.isFinite(uid)) {
      toast.error('You must be signed in to log time');
      return;
    }
    const elapsedSec = Math.max(0, Math.floor((Date.now() - workTimerStartedAt) / 1000));
    const mins = Math.max(1, Math.min(1440, Math.ceil(elapsedSec / 60)));
    const parsed = projectTimeEntryCreateSchema.safeParse({
      business_id: bid,
      project_id: project.id,
      user_id: uid,
      duration_minutes: mins,
      billable: timerBillable,
      notes: `Timer (${elapsedSec}s elapsed, rounded to ${mins} min)`,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      toast.error(msg);
      return;
    }
    setTimerSaving(true);
    try {
      await TimeEntryService.create(parsed.data);
      clearWorkTimerStorage();
      await loadTimeEntries('reset');
      void loadBillableRollup();
      toast.success('Timer saved as a time entry');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save timer');
    } finally {
      setTimerSaving(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id || bid == null) return;
    const trimmed = newTitle.trim();
    if (!trimmed) {
      const msg = 'Task title is required';
      setTaskError(msg);
      toast.error(msg);
      return;
    }
    const assignId: number | undefined =
      newAssigneeUserId === '' ? undefined : Number(newAssigneeUserId);
    if (assignId !== undefined && !isAssignableUserId(assignId, teamMembers)) {
      const msg = 'Choose a team member from this business, or leave assignee empty.';
      setTaskError(msg);
      toast.error(msg);
      return;
    }

    const parsed = projectTaskCreateSchema.safeParse({
      business_id: bid,
      project_id: project.id,
      title: trimmed,
      description: newDescription.trim() || null,
      ...(newPriority !== '' ? { priority: newPriority } : { priority: null }),
      due_on: newDueOn.trim() || undefined,
      status: 'todo',
      ...(assignId !== undefined ? { assigned_to_user_id: assignId } : {}),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      setTaskError(msg);
      toast.error(msg);
      return;
    }
    setCreating(true);
    setTaskError(null);
    try {
      await TaskService.create(parsed.data);
      void notifyTaskCreatedAutomation({ businessId: bid, projectId: project.id });
      setNewTitle('');
      setNewDescription('');
      setNewPriority('');
      setNewDueOn('');
      setNewAssigneeUserId('');
      await loadTasks('reset');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create task';
      setTaskError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const saveTask = async (taskId: number) => {
    const draft = drafts[taskId];
    if (!draft) return;
    if (!isAssignableUserId(draft.assigned_to_user_id, teamMembers)) {
      const msg = 'Assignee must be an active team member for this business, or unassigned.';
      setTaskError(msg);
      toast.error(msg);
      return;
    }

    const parsed = projectTaskUpdateSchema.safeParse({
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      priority: draft.priority === '' ? null : draft.priority,
      status: draft.status,
      due_on: draft.due_on.trim() || null,
      assigned_to_user_id: draft.assigned_to_user_id,
      updated_at: new Date().toISOString(),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      setTaskError(msg);
      toast.error(msg);
      return;
    }
    setTaskError(null);
    try {
      const prevTask = tasks.find((x) => x.id === taskId);
      const previousStatus = String(prevTask?.status ?? 'todo');
      await TaskService.update(taskId, parsed.data);
      const newStatus = String(parsed.data.status ?? draft.status);
      void notifyTaskMarkedDoneAutomation({
        businessId: bid,
        projectId: project.id,
        previousStatus,
        newStatus,
      });
      void notifyTaskStatusChangedAutomation({
        businessId: bid,
        projectId: project.id,
        previousStatus,
        newStatus,
      });
      await loadTasks('reset');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update task';
      setTaskError(msg);
      toast.error(msg);
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!window.confirm('Delete this task?')) return;
    setTaskError(null);
    try {
      await TaskService.delete(taskId);
      await loadTasks('reset');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete task';
      setTaskError(msg);
      toast.error(msg);
    }
  };

  const handleKanbanReorder = async (updates: KanbanPositionUpdate[]) => {
    const filtered = updates.filter((u) => {
      const t = tasks.find((x) => x.id === u.taskId);
      if (!t) return true;
      const curStatus = (t.status ?? 'todo') as ProjectTaskStatus;
      const curPos = Number(t.position ?? 0);
      return curStatus !== u.status || curPos !== u.position;
    });
    if (filtered.length === 0) return;
    setTaskError(null);
    const ts = new Date().toISOString();
    try {
      for (const u of filtered) {
        const t = tasks.find((x) => x.id === u.taskId);
        const previousStatus = String(t?.status ?? 'todo');
        await TaskService.update(u.taskId, {
          position: u.position,
          status: u.status,
          updated_at: ts,
        });
        const newStatus = String(u.status);
        void notifyTaskMarkedDoneAutomation({
          businessId: bid,
          projectId: project.id,
          previousStatus,
          newStatus,
        });
        void notifyTaskStatusChangedAutomation({
          businessId: bid,
          projectId: project.id,
          previousStatus,
          newStatus,
        });
      }
      await loadTasks('reset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reorder tasks');
      await loadTasks('reset');
    }
  };

  const exportLoadedTasksCsv = useCallback(() => {
    if (project?.id == null) return;
    const rows = tasks.filter((t) => t.id != null);
    if (rows.length === 0) {
      toast.error('No tasks loaded to export');
      return;
    }
    const headers = [
      'id',
      'title',
      'status',
      'priority',
      'due_on',
      'position',
      'assigned_to_user_id',
      'description',
    ];
    const body = buildCsvLines(
      headers,
      rows.map((t) => [
        t.id,
        t.title,
        t.status ?? '',
        t.priority ?? '',
        t.due_on?.slice(0, 10) ?? '',
        t.position ?? '',
        t.assigned_to_user_id ?? '',
        t.description ?? '',
      ])
    );
    downloadCsvFile(`project-${project.id}-tasks-loaded.csv`, body);
    toast.success('Tasks CSV downloaded');
  }, [tasks, project?.id]);

  const exportTimelineCsv = useCallback(() => {
    if (project?.id == null) return;
    if (tasks.filter((t) => t.id != null).length === 0) {
      toast.error('No tasks loaded to export');
      return;
    }
    downloadCsvFile(`project-${project.id}-timeline.csv`, buildProjectTimelineCsv(tasks, taskDeps));
    toast.success('Timeline CSV downloaded');
  }, [tasks, taskDeps, project?.id]);

  const exportLoadedTimeEntriesCsv = useCallback(() => {
    if (project?.id == null) return;
    if (timeEntries.length === 0) {
      toast.error('No time entries loaded to export');
      return;
    }
    const headers = ['id', 'logged_at', 'duration_minutes', 'billable', 'task_id', 'user_id', 'notes'];
    const body = buildCsvLines(
      headers,
      timeEntries.map((e: ProjectTimeEntry) => [
        e.id ?? '',
        e.logged_at ?? '',
        e.duration_minutes,
        e.billable ? 'yes' : 'no',
        e.task_id ?? '',
        e.user_id,
        e.notes ?? '',
      ])
    );
    downloadCsvFile(`project-${project.id}-time-entries-loaded.csv`, body);
    toast.success('Time entries CSV downloaded');
  }, [timeEntries, project?.id]);

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Loading…</div>;
  }

  if (error || !company || !project) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Not found.'}</p>
        <Link
          to={Number.isFinite(companyId) ? `/app/companies/${companyId}/projects` : '/app/companies'}
          className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  if (bid == null) {
    return (
      <div className="space-y-4">
        <p className="text-amber-700 dark:text-amber-300">
          Select a business in the app context, or set this project&apos;s business_id, to manage tasks.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/app/companies/${company.id}/projects`)}
          className="text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AppPageHeader
        title={project.name}
        subtitle={`${company.name} · Project tasks`}
        showBackButton
        buttonText="Back"
        showButton
        onBackClick={() => navigate(`/app/companies/${company.id}/projects`)}
      />

      {/* ── Page tab bar ── */}
      <div
        className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5"
        role="tablist"
        aria-label="Project view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'kanban'}
          onClick={() => setPageTab('kanban')}
          className={`rounded-md px-4 py-2 text-xs font-medium min-h-9 ${
            pageTab === 'kanban'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Kanban
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pageTab === 'details'}
          onClick={() => setPageTab('details')}
          className={`rounded-md px-4 py-2 text-xs font-medium min-h-9 ${
            pageTab === 'details'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Details
        </button>
      </div>

      {/* ── Kanban tab ── */}
      {pageTab === 'kanban' && (() => {
        const total = tasks.length;
        const doneCat = categories.find((c) => c.slug === 'done');
        const doneSlug = doneCat?.slug ?? 'done';
        const open = tasks.filter((t) => t.status !== doneSlug).length;
        const done = tasks.filter((t) => t.status === doneSlug).length;
        const today = new Date().toDateString();
        const overdue = tasks.filter(
          (t) => t.status !== doneSlug && t.due_on != null && new Date(String(t.due_on)) < new Date(today)
        ).length;
        const taskCountBySlug = tasks.reduce<Record<string, number>>((acc, t) => {
          const s = String(t.status ?? 'todo');
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {});
        return (
          <div className="space-y-3">
            {/* Summary strip */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <LuCircleDot size={13} className="text-slate-400" />
                {total} task{total !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                <LuCircleDot size={13} />
                {open} open
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <LuCircleCheck size={13} />
                {done} done
              </div>
              {overdue > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-300">
                  <LuCircleAlert size={13} />
                  {overdue} overdue
                </div>
              )}
              {taskError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400 ml-1">
                  {taskError}
                </p>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setManageCatsOpen(true)}
                  title="Manage categories"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <LuSettings2 size={13} />
                  Categories
                </button>
                <button
                  type="button"
                  onClick={() => setKanbanAddOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                >
                  <LuPlus size={14} />
                  Add task
                </button>
              </div>
            </div>

            <NewTaskModal
              isOpen={kanbanAddOpen}
              onClose={() => setKanbanAddOpen(false)}
              businessId={bid}
              defaultProjectId={project.id}
              categories={categories}
              onCreated={() => {
                setKanbanAddOpen(false);
                void loadTasks('reset');
              }}
            />

            <EditTaskModal
              isOpen={editTask != null}
              onClose={() => setEditTask(null)}
              task={editTask}
              categories={categories}
              onSaved={() => {
                setEditTask(null);
                void loadTasks('reset');
              }}
            />

            <ManageCategoriesModal
              isOpen={manageCatsOpen}
              onClose={() => setManageCatsOpen(false)}
              projectId={project.id}
              businessId={bid}
              categories={categories}
              taskCountBySlug={taskCountBySlug}
              onSaved={(updated) => {
                setCategories(updated);
                setManageCatsOpen(false);
              }}
            />

            {tasksLoading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading tasks…</p>
            ) : (
              <ProjectTasksKanban
                tasks={tasks}
                categories={categories}
                onReorder={handleKanbanReorder}
                onTaskClick={(task) => setEditTask(task)}
              />
            )}
          </div>
        );
      })()}

      {/* ── Details tab ── */}
      {pageTab === 'details' && (
        <>
          <ProjectInsightsCard
        tasks={tasks}
        timeEntries={timeEntries}
        project={project}
        onExportTasksCsv={exportLoadedTasksCsv}
        onExportTimeEntriesCsv={exportLoadedTimeEntriesCsv}
      />

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Budget and time</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Planned caps for this project (optional). Billable time logged below counts toward burn when budget
              hours are set.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="project-budget-hours" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Budget hours
                </label>
                <input
                  id="project-budget-hours"
                  type="text"
                  inputMode="decimal"
                  value={budgetHoursInput}
                  onChange={(e) => setBudgetHoursInput(e.target.value)}
                  placeholder="e.g. 40"
                  className="min-h-10 w-32 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="project-budget-amount" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Budget amount
                </label>
                <input
                  id="project-budget-amount"
                  type="text"
                  inputMode="decimal"
                  value={budgetAmountInput}
                  onChange={(e) => setBudgetAmountInput(e.target.value)}
                  placeholder="Same currency as invoices"
                  className="min-h-10 min-w-[10rem] max-w-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                disabled={budgetSaving}
                onClick={() => void handleSaveProjectBudgets()}
                className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {budgetSaving ? 'Saving…' : 'Save budgets'}
              </button>
            </div>
            {project.budget_hours != null &&
              Number.isFinite(Number(project.budget_hours)) &&
              Number(project.budget_hours) > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">Billable vs budget</span>
                {billableRollupLoading ? ' (loading full rollup…)' : null}
                {!billableRollupLoading && billableRollup?.capped ? ' (capped rollup)' : null}:{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {(billableMinutesForBudget / 60).toFixed(1)} h
                </span>{' '}
                of {Number(project.budget_hours)} h budget
                {billableMinutesForBudget / 60 > Number(project.budget_hours) ? (
                  <span className="text-amber-700 dark:text-amber-300">
                    {' '}
                    (over budget
                    {billableRollup != null && !billableRollupLoading && !billableRollup.capped ? '' : ' — may be incomplete'}
                    )
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-4">
            <p>
              Logged ({timeEntries.length}{' '}
              {timeEntries.length === 1 ? 'entry' : 'entries'} in memory{hasMoreTimeEntries ? ', not all loaded' : ''}
              ):{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {(loggedTotalMinutes / 60).toFixed(1)} h
              </span>{' '}
              total,{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {(loggedBillableMinutes / 60).toFixed(1)} h
              </span>{' '}
              billable.
            </p>
            {billableRollupLoading && (
              <p data-testid="billable-rollup-loading" className="text-slate-500 dark:text-slate-500">
                Full billable rollup: loading…
              </p>
            )}
            {!billableRollupLoading && billableRollup != null && (
              <p data-testid="billable-rollup-summary" className="text-slate-600 dark:text-slate-400">
                Full billable rollup (same scan as invoice billable line):{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {(billableRollup.totalMinutes / 60).toFixed(1)} h
                </span>{' '}
                from {billableRollup.entryCount} billable row{billableRollup.entryCount === 1 ? '' : 's'}
                {billableRollup.capped ? ' — scan hit safety cap; total may be low.' : '.'}
              </p>
            )}
            {!billableRollupLoading && billableRollup == null && (
              <p data-testid="billable-rollup-unavailable" className="text-amber-800/90 dark:text-amber-200/80">
                Full billable rollup unavailable; budget line above falls back to loaded entries only.
              </p>
            )}
            {timeEntriesLoading && <p className="text-slate-500">Loading time entries…</p>}
            {timeEntriesLoadingMore && (
              <p className="text-slate-500">Loading older time entries…</p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Timer</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Runs in this browser; survives refresh. Stop saves one entry (duration rounded up to whole minutes, max
            24h per entry).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-lg font-mono tabular-nums text-slate-800 dark:text-slate-100 min-w-[5rem]">
              {workTimerStartedAt != null
                ? formatElapsed(Math.max(0, Math.floor((workTimerTick - workTimerStartedAt) / 1000)))
                : '—'}
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={timerBillable}
                onChange={(e) => setTimerBillable(e.target.checked)}
                disabled={workTimerStartedAt != null}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Billable
            </label>
            {workTimerStartedAt == null ? (
              <button
                type="button"
                onClick={handleWorkTimerStart}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Start timer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={timerSaving}
                  onClick={() => void handleWorkTimerStop()}
                  className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {timerSaving ? 'Saving…' : 'Stop & log'}
                </button>
                <button
                  type="button"
                  disabled={timerSaving}
                  onClick={handleWorkTimerDiscard}
                  className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Discard
                </button>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleLogTime} className="space-y-3 border-t border-slate-100 dark:border-slate-700 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            Log time
          </h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="log-duration-minutes" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Minutes
              </label>
              <input
                id="log-duration-minutes"
                type="number"
                min={1}
                max={1440}
                value={logMinutes}
                onChange={(e) => setLogMinutes(e.target.value)}
                className="min-h-10 w-24 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[10rem]">
              <label htmlFor="log-task-id" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Task (optional)
              </label>
              <select
                id="log-task-id"
                value={logTaskId}
                onChange={(e) => setLogTaskId(e.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm max-w-xs"
              >
                <option value="">Project only</option>
                {tasks
                  .filter((t) => t.id != null)
                  .map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 pb-2">
              <input
                type="checkbox"
                checked={logBillable}
                onChange={(e) => setLogBillable(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600"
              />
              Billable
            </label>
            <div className="flex flex-col gap-1 flex-1 min-w-[12rem] max-w-md">
              <label htmlFor="log-notes" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Notes (optional)
              </label>
              <input
                id="log-notes"
                type="text"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={logSaving}
              className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {logSaving ? 'Saving…' : 'Log time'}
            </button>
          </div>
        </form>

        {timeEntries.length > 0 && (
          <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-700 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 mb-2">
              Recent entries
            </h3>
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Minutes
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Billable
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Task
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((row) => (
                  <tr key={row.id ?? `${row.logged_at}-${row.duration_minutes}`} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-2 pr-3 whitespace-nowrap">{row.logged_at?.slice(0, 16) ?? '—'}</td>
                    <td className="py-2 pr-3">{row.duration_minutes}</td>
                    <td className="py-2 pr-3">{row.billable ? 'Yes' : 'No'}</td>
                    <td className="py-2 pr-3">
                      {row.task_id != null
                        ? tasks.find((t) => t.id === row.task_id)?.title ?? `#${row.task_id}`
                        : '—'}
                    </td>
                    <td className="py-2 max-w-[14rem] truncate">{row.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMoreTimeEntries && (
              <div className="mt-3">
                <button
                  type="button"
                  disabled={timeEntriesLoadingMore}
                  onClick={() => void loadTimeEntries('append')}
                  className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {timeEntriesLoadingMore ? 'Loading…' : 'Load more time entries'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tasks</h2>
          <div
            className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 p-0.5"
            role="group"
            aria-label="Task view"
          >
            <button
              type="button"
              onClick={() => setTaskViewPersisted('list')}
              aria-pressed={taskView === 'list'}
              className={`rounded-md px-3 py-2.5 text-xs font-medium min-h-10 ${
                taskView === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setTaskViewPersisted('timeline')}
              aria-pressed={taskView === 'timeline'}
              className={`rounded-md px-3 py-2.5 text-xs font-medium min-h-10 ${
                taskView === 'timeline'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
        {taskError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {taskError}
          </p>
        )}

        <form onSubmit={handleCreateTask} className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-title-d" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                New task title
              </label>
              <input
                id="new-task-title-d"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title *"
                autoComplete="off"
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-w-[200px]"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[12rem] max-w-xl">
              <label htmlFor="new-task-desc-d" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Description (optional)
              </label>
              <textarea
                id="new-task-desc-d"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                placeholder="Notes…"
                className="min-h-[2.75rem] rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm resize-y"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-priority-d" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Priority
              </label>
              <select
                id="new-task-priority-d"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as '' | 'low' | 'normal' | 'high' | 'urgent')}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-w-[8rem]"
              >
                <option value="">—</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-due-d" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Due (optional)
              </label>
              <input
                id="new-task-due-d"
                type="date"
                value={newDueOn}
                onChange={(e) => setNewDueOn(e.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="new-task-assignee-d" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Assignee (optional)
              </label>
              <select
                id="new-task-assignee-d"
                value={newAssigneeUserId}
                onChange={(e) => setNewAssigneeUserId(e.target.value)}
                className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm min-w-[10rem]"
              >
                <option value="">Unassigned</option>
                {activeTeamMembers.map((m) => (
                  <option key={m.id} value={String(m.user_id)}>
                    User #{m.user_id} ({m.role_key})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="min-h-10 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {creating ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>

        {tasks.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tasks load in pages of {TASK_PAGE_SIZE} (by position). Status and title filters are applied on the server
            (title search is debounced; see docs/03-database/project-tasks-select-filters.md). Board and Timeline use
            every task loaded so far — use Load more if needed. Assignees must be active team members for this
            business.
          </p>
        )}

        {tasksLoading ? (
          <p className="text-sm text-slate-500">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {listStatusFilter !== '' || debouncedTitleQuery ? (
              <>
                No tasks match the current filters.{' '}
                {listFiltersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setListStatusFilter('');
                      setListTitleQuery('');
                    }}
                    className="text-indigo-600 dark:text-indigo-400 underline"
                  >
                    Clear filters
                  </button>
                )}
              </>
            ) : (
              'No tasks yet.'
            )}
          </p>
        ) : taskView === 'timeline' ? (
          <ProjectTasksTimeline
            tasks={tasks}
            dependencies={taskDeps}
            showGanttBars
            onExportCsv={exportTimelineCsv}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/30 p-3">
              <div className="flex flex-col gap-1 min-w-[10rem]">
                <label htmlFor="task-list-status-filter" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Status
                </label>
                <select
                  id="task-list-status-filter"
                  value={listStatusFilter}
                  onChange={(e) =>
                    setListStatusFilter((e.target.value === '' ? '' : e.target.value) as '' | ProjectTaskStatus)
                  }
                  className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {statusOptionLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[12rem] max-w-md">
                <label htmlFor="task-list-title-search" className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  Search title
                </label>
                <input
                  id="task-list-title-search"
                  type="search"
                  value={listTitleQuery}
                  onChange={(e) => setListTitleQuery(e.target.value)}
                  placeholder="Filter by title…"
                  autoComplete="off"
                  className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Title search is sent to the server (debounced). Adjust the filter shape in code if your Skaftin build
                  expects a different operator than <code className="text-xs">ilike</code>.
                </p>
              </div>
              {listFiltersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setListStatusFilter('');
                    setListTitleQuery('');
                  }}
                  className="min-h-10 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
            <>
          <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
            <table className="min-w-full text-left text-sm border-collapse">
              <caption className="sr-only">
                Project tasks: edit fields and press Save. Fetched in pages of {TASK_PAGE_SIZE} by position. Showing{' '}
                {tasks.length} loaded tasks
                {listFiltersActive ? ' (filters applied on server)' : ''}.
              </caption>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Title
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium max-w-[14rem]">
                    Description
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Priority
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Due
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Assignee
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  if (t.id == null) return null;
                  const d: TaskDraft = drafts[t.id] ?? taskRowToDraft(t);
                  const assigneeSelectId = `task-${t.id}-assignee`;
                  return (
                    <tr key={t.id} className="border-b border-slate-100 dark:border-slate-700 align-top">
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={`task-${t.id}-title`}>
                          Title for task {t.id}
                        </label>
                        <input
                          id={`task-${t.id}-title`}
                          type="text"
                          value={d.title}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, title: e.target.value },
                            }))
                          }
                          className="min-h-10 w-full max-w-xs rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-3 max-w-[14rem]">
                        <label className="sr-only" htmlFor={`task-${t.id}-desc`}>
                          Description for task {t.id}
                        </label>
                        <textarea
                          id={`task-${t.id}-desc`}
                          rows={2}
                          value={d.description}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, description: e.target.value },
                            }))
                          }
                          className="min-h-[2.5rem] w-full rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm resize-y"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={`task-${t.id}-priority`}>
                          Priority for task {t.id}
                        </label>
                        <select
                          id={`task-${t.id}-priority`}
                          value={d.priority}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: {
                                ...d,
                                priority: e.target.value as TaskDraft['priority'],
                              },
                            }))
                          }
                          className="min-h-10 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        >
                          <option value="">—</option>
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={`task-${t.id}-status`}>
                          Status for task {t.id}
                        </label>
                        <select
                          id={`task-${t.id}-status`}
                          value={d.status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, status: e.target.value as ProjectTaskStatus },
                            }))
                          }
                          className="min-h-10 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {statusOptionLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={`task-${t.id}-due`}>
                          Due date for task {t.id}
                        </label>
                        <input
                          id={`task-${t.id}-due`}
                          type="date"
                          value={d.due_on}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: { ...d, due_on: e.target.value },
                            }))
                          }
                          className="min-h-10 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <label className="sr-only" htmlFor={assigneeSelectId}>
                          Assignee for task {t.id}
                        </label>
                        <select
                          id={assigneeSelectId}
                          value={d.assigned_to_user_id != null ? String(d.assigned_to_user_id) : ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setDrafts((prev) => ({
                              ...prev,
                              [t.id!]: {
                                ...d,
                                assigned_to_user_id: v === '' ? null : Number(v),
                              },
                            }));
                          }}
                          className="min-h-10 max-w-[12rem] rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-2 text-sm"
                        >
                          <option value="">Unassigned</option>
                          {activeTeamMembers.map((m) => (
                            <option key={m.id} value={String(m.user_id)}>
                              User #{m.user_id} ({m.role_key})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          onClick={() => saveTask(t.id!)}
                          className="min-h-10 rounded border border-slate-200 dark:border-slate-600 px-3 py-2 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTask(t.id!)}
                          className="min-h-10 rounded border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasMoreTasks && (
            <button
              type="button"
              disabled={tasksLoadingMore}
              onClick={() => {
                void loadTasks('append');
              }}
              className="rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {tasksLoadingMore ? 'Loading…' : `Load more (${tasks.length} loaded)`}
            </button>
          )}
          </>
          </div>
        )}
      </div>

          <ProjectTaskDependenciesCard
            projectId={project.id}
            businessId={bid}
            tasks={tasks}
            dependencies={taskDeps}
            onChanged={() => void loadTaskDeps()}
          />

          <ProjectPortalInvitesCard projectId={project.id} businessId={bid} projectName={project.name} />

          <ProjectAutomationRulesCard projectId={project.id} businessId={bid} />
        </>
      )}
    </div>
  );
}
