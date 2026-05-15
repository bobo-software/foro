# Project tasks (MVP)

Task **list** and **Kanban board** under each company project, plus **My tasks** for the current business ([`/app/tasks`](../../src/App.tsx)). **Progress log:** [PROGRESS.md](../plans/project-task-management/PROGRESS.md). **Plan updates (agents):** [`.cursor/rules/project-plan-updates.mdc`](../../.cursor/rules/project-plan-updates.mdc).

## Routes

| Path | Page |
|------|------|
| `/app/tasks` | [MyTasksPage](../../src/pages/admin/tasks/MyTasksPage.tsx) — tasks assigned to you in the **active** business (deep-links into each project) |
| `/app/companies/:companyId/projects` | [CompanyProjectsPage](../../src/pages/admin/companies/CompanyProjectsPage.tsx) — project list, document shortcuts |
| `/app/companies/:companyId/projects/:projectId` | [ProjectDetailPage](../../src/pages/admin/companies/ProjectDetailPage.tsx) — project summary, **budget and time** (manual log, **browser timer**), **List \| Board \| Timeline** tasks |
| `/portal` | [PortalLandingPage](../../src/pages/portal/PortalLandingPage.tsx) — **public** client-portal forward stub (no portal auth or data); see [project-phase8-portal-gantt-automation.md](../02-modules/project-phase8-portal-gantt-automation.md) |

Register the detail route **before** the projects index route so `:projectId` is not captured as a literal segment ([App.tsx](../../src/App.tsx)).

## UI

- **List:** inline edit (title, **description**, **priority**, status, due, **assignee**), Save / Delete. **Filters (list view):** **status** uses Skaftin `where` (All = no status filter); case-insensitive **title** substring is sent to the server on a **debounced** `where.title` + `ilike` pattern (see [project-tasks-select-filters.md](../03-database/project-tasks-select-filters.md)); “Clear filters” when active. **Load more** fetches the next page (**50** rows) so large projects can be browsed; the **Board** shows every task loaded so far. Assignee options: **Unassigned** plus **active** `team_memberships` for the business; invalid ids are rejected before save. Table uses accessible captions/labels and `role="alert"` for task-level errors.
- **Board:** [ProjectTasksKanban](../../src/pages/admin/companies/ProjectTasksKanban.tsx) — columns = task statuses; **sortable** cards (`@dnd-kit/sortable`). Dropping a card updates **`status`** and/or **`position`** (0-based order within each column) via batched `TaskService.update` calls; parent refetches after success. View mode is stored in `localStorage` per project id (`foro_project_tasks_view_<projectId>`). Reorder logic is covered by Vitest in [`projectKanbanReorder.test.ts`](../../src/utils/projectKanbanReorder.test.ts).
- **Timeline (Phase 8):** [ProjectTasksTimeline](../../src/pages/admin/companies/ProjectTasksTimeline.tsx) — read-only **due date** schedule, **Overdue** (open tasks before local today), **Today** label, **Unscheduled** bucket; same loaded task set as Board. Planning doc: [project-phase8-portal-gantt-automation.md](../02-modules/project-phase8-portal-gantt-automation.md).
- **Budget and time:** optional project budgets; manual time entries + **browser timer** (stored in `localStorage` per project + business); invoicing with a project uses [InvoiceForm](../../src/components/elements/InvoiceForm.tsx) for a **paged billable rollup** and optional **“add billable time as line item”** (hours line; suggested rate from budget hours/amount when both are set).

## Data

- **Tables:** `project_tasks` — [project-tasks-schema-contract.md](../03-database/project-tasks-schema-contract.md), [sql/project-tasks.sql](../03-database/sql/project-tasks.sql). **Time:** `project_time_entries` — [project-time-entries-schema-contract.md](../03-database/project-time-entries-schema-contract.md), [sql/project-time-entries.sql](../03-database/sql/project-time-entries.sql); optional **budget** columns on `projects` — [project-budget-columns-contract.md](../03-database/project-budget-columns-contract.md), [sql/project-budget-columns.sql](../03-database/sql/project-budget-columns.sql).
- **Services:** [TaskService](../../src/services/taskService.ts), [TimeEntryService](../../src/services/timeEntryService.ts) — same Skaftin table API pattern as `ProjectService`.
- **Validation:** `projectTaskCreateSchema` / `projectTaskUpdateSchema` / `projectTimeEntryCreateSchema` in [schemas.ts](../../src/validation/schemas.ts).
- **Fetch / pagination:** project detail requests **`limit: 50`** with **`offset`**; **Load more** appends the next page. **Status** and **title** filters are merged into Skaftin `where` for list loads (title debounced in the UI).

## Behaviour notes

- `business_id` on tasks is **not** FK-enforced in the database; the UI derives it from the parent `projects` row or `useBusinessStore` so `TaskService.findAll` can scope by `{ project_id, business_id }`.
- Updates send `updated_at` from the client so the row reflects edits when the API persists it.
- **Assignee:** [`projectTaskAssignee`](../../src/utils/projectTaskAssignee.ts) centralises “assignable = active membership user id or null”.
