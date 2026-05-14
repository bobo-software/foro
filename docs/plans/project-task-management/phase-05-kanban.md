# Phase 5: Kanban MVP

**Prerequisite:** [phase-04-task-list.md](./phase-04-task-list.md).

**Blocks:** [phase-06-polish.md](./phase-06-polish.md) (polish can start in parallel on list view only if desired).

## Objective

Add a **board view** of the same tasks: columns = status values; moving a card updates `status` on the server.

## Deliverables

- [ ] Toggle or tabs on project detail: **List** | **Board** (persist preference in `localStorage` optional).
- [ ] Integrate **dnd-kit** (or chosen library from [../README.md](../README.md)) with column layout consistent with Foro styling.
- [ ] Drag card to column → `TaskService.update` with new `status`; handle failure (toast + revert position).
- [ ] If phase 1 added `sort_order` / `position`, update on drop; otherwise document ordering as `due_date` then `updated_at`.
- [ ] Resolve **open question** #4 if ordering bugs appear in production-like data.

## Exit criteria

- Board and list show the same data; refresh preserves state.
- Keyboard users can at least change status via existing edit path if full keyboard drag is deferred—note limitation in phase 6 if so.

## Out of scope

- Swimlanes, WIP limits, cross-project boards.
- Subtasks in cards.
