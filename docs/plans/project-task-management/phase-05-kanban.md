# Phase 5: Kanban MVP

**Status:** Done (2026-05-14). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** [phase-04-task-list.md](./phase-04-task-list.md).

**Blocks:** [phase-06-polish.md](./phase-06-polish.md) (polish can start in parallel on list view only if desired).

## Objective

Add a **board view** of the same tasks: columns = status values; moving a card updates `status` on the server.

## Deliverables

- [x] Toggle or tabs on project detail: **List** | **Board** (persist preference in `localStorage` per `projectId`, key prefix `foro_project_tasks_view_`).
- [x] Integrate **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/utilities`, **`@dnd-kit/sortable`**) — [`ProjectTasksKanban.tsx`](../../../src/pages/admin/companies/ProjectTasksKanban.tsx); per-column **`SortableContext`** + **`useSortable`** cards.
- [x] Drag card to column → `TaskService.update` with new `status` + `position` + `updated_at` (batched for all affected rows in source/target columns); failure → `toast.error` + refetch list.
- [x] On drop within column or across columns, recompute **`position`** (0…n−1 per status column); list continues to sort by `position` ASC from server. Pure logic + tests in [`projectKanbanReorder.ts`](../../../src/utils/projectKanbanReorder.ts).
- [x] **Open question** #4: **`closestCorners`** kept as default collision algorithm; if mis-drops are reported in production, try **`pointerWithin`** or adjust sensors first.

## Exit criteria

- Board and list show the same data; refresh preserves state.
- Keyboard users can at least change status via existing **List** edit path if full keyboard drag is deferred—note limitation in phase 6 if so.

## Out of scope

- Swimlanes, WIP limits, cross-project boards.
- Subtasks in cards.
