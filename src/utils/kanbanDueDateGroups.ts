import type { ProjectTask } from '@/types/task';
import { localDateISO } from '@/utils/localDateISO';

export type KanbanDueDateGroup = {
  key: string;
  label: string;
  tasks: ProjectTask[];
};

function addDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateISO(dt);
}

function isOpenTask(status: string | undefined): boolean {
  return String(status ?? 'todo') !== 'done';
}

function comparePosition(a: ProjectTask, b: ProjectTask): number {
  return (
    (Number(a.position) || 0) - (Number(b.position) || 0) ||
    (Number(a.id) || 0) - (Number(b.id) || 0)
  );
}

export function labelForDueDate(dueIso: string, todayIso: string): string {
  if (dueIso === todayIso) return 'Today';
  const yesterday = addDaysIso(todayIso, -1);
  if (dueIso === yesterday) return 'Yesterday';
  const tomorrow = addDaysIso(todayIso, 1);
  if (dueIso === tomorrow) return 'Tomorrow';
  const [y, m, d] = dueIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

type BucketKind = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'yesterday' | 'past' | 'none';

function bucketKind(dueIso: string | undefined, todayIso: string): { kind: BucketKind; due?: string } {
  if (!dueIso || dueIso.length < 10) return { kind: 'none' };
  const due = dueIso.slice(0, 10);
  const yesterday = addDaysIso(todayIso, -1);
  const tomorrow = addDaysIso(todayIso, 1);

  if (due < todayIso) {
    if (due === yesterday) return { kind: 'yesterday', due };
    return { kind: 'past', due };
  }
  if (due === todayIso) return { kind: 'today', due };
  if (due === tomorrow) return { kind: 'tomorrow', due };
  return { kind: 'upcoming', due };
}

/**
 * Groups column tasks with date separator labels (Today, Yesterday, …).
 * Order: overdue → today → tomorrow → upcoming → yesterday → older past days → no date.
 */
export function groupKanbanColumnTasksByDueDate(
  tasks: ProjectTask[],
  todayIso = localDateISO()
): KanbanDueDateGroup[] {
  const overdue: ProjectTask[] = [];
  const today: ProjectTask[] = [];
  const tomorrow: ProjectTask[] = [];
  const upcoming = new Map<string, ProjectTask[]>();
  const yesterday: ProjectTask[] = [];
  const pastByDay = new Map<string, ProjectTask[]>();
  const none: ProjectTask[] = [];

  const yesterdayIso = addDaysIso(todayIso, -1);

  for (const t of tasks) {
    const due = t.due_on?.slice(0, 10);
    if (!due) {
      none.push(t);
      continue;
    }
    if (due < yesterdayIso && isOpenTask(t.status)) {
      overdue.push(t);
      continue;
    }
    const { kind } = bucketKind(due, todayIso);
    switch (kind) {
      case 'today':
        today.push(t);
        break;
      case 'tomorrow':
        tomorrow.push(t);
        break;
      case 'upcoming': {
        const list = upcoming.get(due) ?? [];
        list.push(t);
        upcoming.set(due, list);
        break;
      }
      case 'yesterday':
        yesterday.push(t);
        break;
      case 'past': {
        const list = pastByDay.get(due) ?? [];
        list.push(t);
        pastByDay.set(due, list);
        break;
      }
      default:
        none.push(t);
    }
  }

  const sortList = (list: ProjectTask[]) => list.sort(comparePosition);

  sortList(overdue);
  sortList(today);
  sortList(tomorrow);
  sortList(yesterday);
  sortList(none);
  for (const list of upcoming.values()) sortList(list);
  for (const list of pastByDay.values()) sortList(list);

  const groups: KanbanDueDateGroup[] = [];
  const push = (key: string, label: string, list: ProjectTask[]) => {
    if (list.length === 0) return;
    groups.push({ key, label, tasks: list });
  };

  push('overdue', 'Overdue', overdue);
  push('today', 'Today', today);
  push('tomorrow', 'Tomorrow', tomorrow);

  const upcomingDays = [...upcoming.keys()].sort((a, b) => a.localeCompare(b));
  for (const due of upcomingDays) {
    push(`upcoming:${due}`, labelForDueDate(due, todayIso), upcoming.get(due)!);
  }

  push('yesterday', 'Yesterday', yesterday);

  const pastDays = [...pastByDay.keys()].sort((a, b) => b.localeCompare(a));
  for (const due of pastDays) {
    push(`past:${due}`, labelForDueDate(due, todayIso), pastByDay.get(due)!);
  }

  push('none', 'No due date', none);

  return groups;
}

/** Flat task order for DnD (same order as rendered groups). */
export function flattenKanbanDueDateGroups(groups: KanbanDueDateGroup[]): ProjectTask[] {
  return groups.flatMap((g) => g.tasks);
}
