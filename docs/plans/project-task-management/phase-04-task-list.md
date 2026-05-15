# Phase 4: Task list MVP

**Status:** Done (2026-05-14). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** [phase-03-project-detail.md](./phase-03-project-detail.md).

**Blocks:** [phase-05-kanban.md](./phase-05-kanban.md).

## Objective

Ship daily-usable **list** task management: create, read, update, delete tasks for one project with sensible defaults and filters.

## Deliverables

- [x] Tasks panel on project detail: fetch via `TaskService` scoped by `project_id` + `business_id`.
- [x] Create task: minimal form (title required; optional due date; default status `todo`). **Description** and **priority** on create and list edit are **shipped** ([`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx)).
- [x] Edit/delete task with confirmation for destructive action.
- [x] List/table UI (simple HTML table; not yet full [ui-data-tables.md](../../02-modules/ui-data-tables.md) / MRT patterns).
- [x] Basic filters: **status** (All + each enum) and **title** substring search on the **list** view only; Board still shows all loaded tasks. Clear filters control when either filter is active.
- [x] Fixed status enum in code matching DB CHECK (`projectTaskCreateSchema` / `projectTaskUpdateSchema`).

## Documentation

- [x] `docs/02-modules/` — [project-tasks.md](../../02-modules/project-tasks.md).

## Exit criteria

- A user can run a small client engagement entirely from the list view without Kanban.
- No drag-and-drop required yet.

## Out of scope

- Kanban columns and dnd-kit (phase 5).
- Assignee picker polish (phase 6; optional minimal select here if trivial).
