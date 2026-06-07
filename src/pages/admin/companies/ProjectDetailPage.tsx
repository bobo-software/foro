import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { logger } from '@/utils/logger';
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
import { ProjectTaskDependenciesCard } from './ProjectTaskDependenciesCard';
import { ProjectPortalInvitesCard } from './ProjectPortalInvitesCard';
import { ProjectAutomationRulesCard } from './ProjectAutomationRulesCard';
import { ProjectInsightsCard } from './ProjectInsightsCard';
import { ProjectTimeEntryPanel } from './ProjectTimeEntryPanel';
import { ProjectTasksCard } from './ProjectTasksCard';

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
  const [newPriority, setNewPriority] = useState<'' | ProjectTaskPriority>('');
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
    } catch (e) {
      logger.warn('Failed to load task dependencies', e);
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
    } catch (e) {
      logger.warn('Failed to load task categories', e);
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
    } catch (e) {
      logger.warn('Failed to load billable rollup', e);
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

      <ProjectTimeEntryPanel
        project={project}
        tasks={tasks}
        budgetHoursInput={budgetHoursInput}
        onBudgetHoursChange={setBudgetHoursInput}
        budgetAmountInput={budgetAmountInput}
        onBudgetAmountChange={setBudgetAmountInput}
        budgetSaving={budgetSaving}
        onSaveBudgets={() => void handleSaveProjectBudgets()}
        billableMinutesForBudget={billableMinutesForBudget}
        billableRollup={billableRollup}
        billableRollupLoading={billableRollupLoading}
        timeEntries={timeEntries}
        hasMoreTimeEntries={hasMoreTimeEntries}
        loggedTotalMinutes={loggedTotalMinutes}
        loggedBillableMinutes={loggedBillableMinutes}
        timeEntriesLoading={timeEntriesLoading}
        timeEntriesLoadingMore={timeEntriesLoadingMore}
        onLoadMoreTimeEntries={() => void loadTimeEntries('append')}
        workTimerStartedAt={workTimerStartedAt}
        workTimerTick={workTimerTick}
        timerBillable={timerBillable}
        onTimerBillableChange={setTimerBillable}
        timerSaving={timerSaving}
        onTimerStart={handleWorkTimerStart}
        onTimerStop={() => void handleWorkTimerStop()}
        onTimerDiscard={handleWorkTimerDiscard}
        logMinutes={logMinutes}
        onLogMinutesChange={setLogMinutes}
        logTaskId={logTaskId}
        onLogTaskIdChange={setLogTaskId}
        logBillable={logBillable}
        onLogBillableChange={setLogBillable}
        logNotes={logNotes}
        onLogNotesChange={setLogNotes}
        logSaving={logSaving}
        onLogTimeSubmit={handleLogTime}
      />

      <ProjectTasksCard
        tasks={tasks}
        taskDeps={taskDeps}
        tasksLoading={tasksLoading}
        tasksLoadingMore={tasksLoadingMore}
        hasMoreTasks={hasMoreTasks}
        taskError={taskError}
        taskView={taskView}
        onSetTaskView={setTaskViewPersisted}
        drafts={drafts}
        setDrafts={setDrafts}
        newTitle={newTitle}
        onNewTitleChange={setNewTitle}
        newDescription={newDescription}
        onNewDescriptionChange={setNewDescription}
        newPriority={newPriority}
        onNewPriorityChange={setNewPriority}
        newDueOn={newDueOn}
        onNewDueOnChange={setNewDueOn}
        newAssigneeUserId={newAssigneeUserId}
        onNewAssigneeUserIdChange={setNewAssigneeUserId}
        creating={creating}
        onCreateTaskSubmit={handleCreateTask}
        listStatusFilter={listStatusFilter}
        onListStatusFilterChange={setListStatusFilter}
        listTitleQuery={listTitleQuery}
        onListTitleQueryChange={setListTitleQuery}
        debouncedTitleQuery={debouncedTitleQuery}
        listFiltersActive={listFiltersActive}
        onSaveTask={saveTask}
        onDeleteTask={deleteTask}
        onLoadMoreTasks={() => void loadTasks('append')}
        onExportTimelineCsv={exportTimelineCsv}
        activeTeamMembers={activeTeamMembers}
      />

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
