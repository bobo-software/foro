# Phase 4: Task list MVP

**Prerequisite:** [phase-03-project-detail.md](./phase-03-project-detail.md).

**Blocks:** [phase-05-kanban.md](./phase-05-kanban.md).

## Objective

Ship daily-usable **list** task management: create, read, update, delete tasks for one project with sensible defaults and filters.

## Deliverables

- [ ] Tasks panel on project detail: fetch via `TaskService` scoped by `project_id` + `business_id`.
- [ ] Create task: minimal form (title required; optional description, due date, status, priority per phase 1 contract).
- [ ] Edit/delete task with confirmation for destructive action.
- [ ] List/table UI: follow [ui-data-tables.md](../../02-modules/ui-data-tables.md) patterns where applicable (sorting, empty state, loading/error).
- [ ] Basic filters: at least by `status`; optional text search on title if cheap.
- [ ] Resolve **open question** #2 enough for UI: fixed status enum in code matching DB check constraint or varchar policy.

## Documentation

- [ ] `docs/02-modules/` short note: task list module, routes, service entry points.

## Exit criteria

- A user can run a small client engagement entirely from the list view without Kanban.
- No drag-and-drop required yet.

## Out of scope

- Kanban columns and dnd-kit (phase 5).
- Assignee picker polish (phase 6; optional minimal select here if trivial).
