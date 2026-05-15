import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LuCalendar, LuFlag } from 'react-icons/lu';
import type { ProjectTask, ProjectTaskPriority } from '@/types/task';
import type { TaskCategory } from '@/types/taskCategory';
import { CATEGORY_COLOR_PRESETS } from '@/components/modals/ManageCategoriesModal';
import {
  type KanbanPositionUpdate,
  computeKanbanDragUpdates,
  taskDndId,
} from '@/utils/projectKanbanReorder';

// ── Column styling from category color ───────────────────────────────────────

type ColStyle = { header: string; dot: string };

const COLOR_MAP: Record<string, ColStyle> = {
  '#94a3b8': { header: 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300',         dot: 'bg-slate-400 dark:bg-slate-500' },
  '#3b82f6': { header: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',              dot: 'bg-blue-500' },
  '#8b5cf6': { header: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',      dot: 'bg-violet-500' },
  '#ef4444': { header: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',                  dot: 'bg-red-500' },
  '#10b981': { header: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',  dot: 'bg-emerald-500' },
  '#f59e0b': { header: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',          dot: 'bg-amber-500' },
  '#06b6d4': { header: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',              dot: 'bg-cyan-500' },
  '#84cc16': { header: 'bg-lime-50 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',              dot: 'bg-lime-500' },
  '#ec4899': { header: 'bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',              dot: 'bg-pink-500' },
  '#f97316': { header: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',      dot: 'bg-orange-500' },
};

function colStyle(color: string | null | undefined): ColStyle {
  const hex = (color ?? '').toLowerCase();
  return COLOR_MAP[hex] ?? COLOR_MAP[CATEGORY_COLOR_PRESETS[0].hex];
}

// ── Priority config ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { badge: string; icon: string; label: string }> = {
  urgent: { badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',              icon: 'text-red-500',    label: 'Urgent' },
  high:   { badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',  icon: 'text-orange-500', label: 'High' },
  normal: { badge: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',           icon: 'text-blue-400',   label: 'Normal' },
  low:    { badge: 'bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400',      icon: 'text-slate-400',  label: 'Low' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(due_on: string | null | undefined): boolean {
  if (!due_on) return false;
  return new Date(due_on) < new Date(new Date().toDateString());
}

function formatDue(due_on: string): string {
  const d = new Date(due_on);
  const today = new Date(new Date().toDateString());
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `${diff}d left`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Card content ──────────────────────────────────────────────────────────────

function KanbanCardContent({ task }: { task: ProjectTask }) {
  const priority = task.priority as ProjectTaskPriority | undefined;
  const priorityCfg = priority ? PRIORITY_CONFIG[priority] : null;
  const overdue = isOverdue(task.due_on);
  const due = task.due_on ? String(task.due_on).slice(0, 10) : null;

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-slate-600/60 bg-white dark:bg-slate-800 px-3.5 py-3 shadow-sm">
      {priorityCfg && (
        <div className="flex items-center gap-1 mb-2">
          <LuFlag size={10} className={priorityCfg.icon} />
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${priorityCfg.badge}`}>
            {priorityCfg.label}
          </span>
        </div>
      )}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-3 leading-snug">
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
          {task.description}
        </p>
      )}
      {due && (
        <div className={`mt-2.5 flex items-center gap-1 text-[11px] font-medium ${overdue ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
          <LuCalendar size={11} />
          {formatDue(due)}
        </div>
      )}
    </div>
  );
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function SortableKanbanCard({ task, onEdit }: { task: ProjectTask; onEdit?: (t: ProjectTask) => void }) {
  if (task.id == null) return null;
  const id = taskDndId(task.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      {...listeners}
      {...attributes}
      onClick={() => onEdit?.(task)}
      aria-label={`Task: ${task.title}. Click to edit, drag to move.`}
      className="cursor-grab active:cursor-grabbing touch-manipulation select-none hover:shadow-md transition-shadow"
    >
      <KanbanCardContent task={task} />
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

function KanbanColumn({
  category,
  tasks,
  onTaskClick,
}: {
  category: TaskCategory;
  tasks: ProjectTask[];
  onTaskClick?: (t: ProjectTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: category.slug });
  const { header, dot } = colStyle(category.color);
  const itemIds = tasks.map((t) => taskDndId(t.id!));

  return (
    <div className="flex min-w-[min(100%,15rem)] w-60 shrink-0 flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 snap-start">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-2xl ${header}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="text-xs font-semibold tracking-wide">{category.name}</span>
        <span className="ml-auto text-xs font-medium opacity-70">{tasks.length}</span>
      </div>

      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          role="group"
          aria-label={`${category.name} column`}
          className={`flex flex-1 flex-col gap-2 p-2 overflow-y-auto rounded-b-2xl transition-colors ${
            isOver ? 'bg-indigo-50/60 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-400/60' : ''
          }`}
        >
          {tasks.map((t) => (
            <SortableKanbanCard key={t.id} task={t} onEdit={onTaskClick} />
          ))}

          {tasks.length === 0 && (
            <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/70 min-h-24">
              <p className="text-[11px] text-slate-300 dark:text-slate-600 select-none">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Board ─────────────────────────────────────────────────────────────────────

type Props = {
  tasks: ProjectTask[];
  categories: TaskCategory[];
  onReorder: (updates: KanbanPositionUpdate[]) => Promise<void>;
  onTaskClick?: (task: ProjectTask) => void;
};

export function ProjectTasksKanban({ tasks, categories, onReorder, onTaskClick }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeTask = activeId != null
    ? (tasks.find((t) => t.id != null && taskDndId(t.id) === activeId) ?? null)
    : null;

  const columnIds = categories.map((c) => c.slug);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const updates = computeKanbanDragUpdates(tasks, String(active.id), String(over.id), columnIds);
    if (updates == null || updates.length === 0) return;
    await onReorder(updates);
  };

  const handleDragCancel = () => setActiveId(null);

  const tasksInColumn = (slug: string) =>
    tasks.filter((t) => (t.status ?? 'todo') === slug && t.id != null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        role="region"
        aria-label="Task board"
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-pl-2 h-[calc(100vh-16rem)]"
      >
        {categories.map((cat) => (
          <KanbanColumn
            key={cat.slug}
            category={cat}
            tasks={tasksInColumn(cat.slug)}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask != null && (
          <div className="w-60 rotate-1 scale-[1.03] shadow-2xl cursor-grabbing">
            <KanbanCardContent task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
