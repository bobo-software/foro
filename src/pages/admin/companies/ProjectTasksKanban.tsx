import {
  DndContext,
  type DragEndEvent,
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
import type { ProjectTask, ProjectTaskStatus } from '@/types/task';
import {
  type KanbanPositionUpdate,
  KANBAN_COLUMN_IDS,
  computeKanbanDragUpdates,
  taskDndId,
} from '@/utils/projectKanbanReorder';

function labelForStatus(s: ProjectTaskStatus): string {
  return String(s)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function SortableKanbanCard({ task }: { task: ProjectTask }) {
  if (task.id == null) return null;
  const id = taskDndId(task.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const label = `Task: ${task.title}. Drag to reorder within the column or move to another column.`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      aria-label={label}
      className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 shadow-sm cursor-grab active:cursor-grabbing touch-manipulation min-h-12"
    >
      <p className="font-medium line-clamp-3">{task.title}</p>
      {task.due_on && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Due {String(task.due_on).slice(0, 10)}</p>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
}: {
  status: ProjectTaskStatus;
  tasks: ProjectTask[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colLabel = `${labelForStatus(status)} column`;
  const itemIds = tasks.map((t) => taskDndId(t.id!));

  return (
    <div className="flex min-w-[min(100%,14rem)] w-56 shrink-0 flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 snap-start">
      <div className="border-b border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
        {labelForStatus(status)}
        <span className="ml-1 font-normal text-slate-400">({tasks.length})</span>
      </div>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          role="group"
          aria-label={colLabel}
          className={`flex min-h-[min(12rem,40vh)] flex-1 flex-col gap-2 p-2 ${isOver ? 'ring-2 ring-indigo-400 ring-inset rounded-b-xl' : ''}`}
        >
          {tasks.map((t) => (
            <SortableKanbanCard key={t.id} task={t} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

type Props = {
  tasks: ProjectTask[];
  onReorder: (updates: KanbanPositionUpdate[]) => Promise<void>;
};

export function ProjectTasksKanban({ tasks, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const updates = computeKanbanDragUpdates(tasks, String(active.id), String(over.id));
    if (updates == null || updates.length === 0) return;
    await onReorder(updates);
  };

  const byStatus = (s: ProjectTaskStatus) =>
    tasks.filter((t) => (t.status ?? 'todo') === s && t.id != null);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div
        role="region"
        aria-label="Task board: drag cards to reorder within a column or move between columns"
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-pl-2"
      >
        {KANBAN_COLUMN_IDS.map((status) => (
          <KanbanColumn key={status} status={status} tasks={byStatus(status)} />
        ))}
      </div>
    </DndContext>
  );
}
