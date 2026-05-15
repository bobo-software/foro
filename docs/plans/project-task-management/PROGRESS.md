# Project & task management — progress log

Single place to see **what shipped**, **what is in progress**, and **what is next**. Phase specs live in [README.md](./README.md) and `phase-*.md` in this folder.

How to update this doc when shipping PM work: see repo rule **[`.cursor/rules/project-plan-updates.mdc`](../../../.cursor/rules/project-plan-updates.mdc)**.

| Last reviewed | 2026-05-15 |
|---------------|------------|

## Summary

| Phase | Status | Notes |
|-------|--------|--------|
| [1](./phase-01-schema-contract.md) | **Done** | `project_tasks` DDL + contract; applied on connected Skaftin via MCP `execute_sql`; re-verify per environment. |
| [2](./phase-02-access-layer.md) | **Done** | [`src/types/task.ts`](../../../src/types/task.ts), Zod in [`schemas.ts`](../../../src/validation/schemas.ts), [`TaskService`](../../../src/services/taskService.ts), Vitest in [`schemas.test.ts`](../../../src/validation/schemas.test.ts). |
| [3](./phase-03-project-detail.md) | **Done** | Route `/app/companies/:id/projects/:projectId`, [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx), link from [`CompanyProjectsPage`](../../../src/pages/admin/companies/CompanyProjectsPage.tsx). |
| [4](./phase-04-task-list.md) | **Done** | List CRUD + `TaskService` scope; **list filters** (server **status**; **title** was client-side in early MVP, now **server `ilike`** on detail); **description + priority** on create and list rows. |
| [5](./phase-05-kanban.md) | **Done** | List/Board toggle, `ProjectTasksKanban` with sortable cards, cross-column + intra-column drag; **`position`** normalized per column via [`projectKanbanReorder`](../../../src/utils/projectKanbanReorder.ts); batched `TaskService.update`. |
| [6](./phase-06-polish.md) | **Done** | My tasks **route** `/app/tasks`, RTL tests for `MyTasksPage`; project tasks **paged fetch** (50 + Load more), **server status** filter; create/list **description + priority**; prior assignee + a11y + Kanban sensors. |
| [7](./phase-07-time-budgets-billing.md) | **MVP slice done** | `project_time_entries`, project budget columns, log time + budgets on project detail; billable summary on invoice form; server title `ilike` for tasks. |
| [8](./phase-08-portal-gantt-automation.md) | **8a–8b done** | **Timeline** (due date, **Overdue** / **Today**, unscheduled) + public **`/portal`** shell ([`PortalLandingPage`](../../../src/pages/portal/PortalLandingPage.tsx)); hub [project-phase8-portal-gantt-automation.md](../../../docs/02-modules/project-phase8-portal-gantt-automation.md). Scoped portal auth + full Gantt + automation still open. |
| [9](./phase-09-analytics.md) | **Planning only** | Post-MVP stub. |

## Shipped artifacts (code)

- **Routes:** [`App.tsx`](../../../src/App.tsx) — `companies/:id/projects/:projectId` before `companies/:id/projects`; public **`/portal`** (client portal forward stub).
- **UI:** [`ProjectDetailPage.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.tsx) — project guard, **budget and time** card, **List / Board / Timeline** tasks, create / save / delete, **paged task load** + **Load more**, server **status** + **debounced title** `where`, **description/priority** fields.
- **Timeline:** [`ProjectTasksTimeline.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.tsx); Vitest [`ProjectTasksTimeline.test.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.test.tsx).
- **Portal (stub):** [`PortalLandingPage.tsx`](../../../src/pages/portal/PortalLandingPage.tsx); Vitest [`PortalLandingPage.test.tsx`](../../../src/pages/portal/PortalLandingPage.test.tsx).
- **My tasks:** [`MyTasksPage.tsx`](../../../src/pages/admin/tasks/MyTasksPage.tsx) — `/app/tasks`; Vitest [`MyTasksPage.test.tsx`](../../../src/pages/admin/tasks/MyTasksPage.test.tsx).
- **Project detail tests:** [`ProjectDetailPage.test.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.test.tsx) — debounced title `ilike`, filter empty copy.
- **Invoice form tests:** [`InvoiceForm.test.tsx`](../../../src/components/elements/InvoiceForm.test.tsx) — billable summary + append line.
- **Time entry rollup test:** [`timeEntryService.test.ts`](../../../src/services/timeEntryService.test.ts) — multi-page `sumBillableMinutesForProject`.
- **Kanban:** [`ProjectTasksKanban.tsx`](../../../src/pages/admin/companies/ProjectTasksKanban.tsx) — `@dnd-kit/core` + `@dnd-kit/sortable` (`SortableContext`, `useSortable`), `@dnd-kit/utilities`; reorder math in [`projectKanbanReorder.ts`](../../../src/utils/projectKanbanReorder.ts) (+ Vitest).
- **Assignee helpers:** [`projectTaskAssignee.ts`](../../../src/utils/projectTaskAssignee.ts) (+ Vitest).
- **Data:** [`taskService.ts`](../../../src/services/taskService.ts) — table `project_tasks`; `update()` accepts `updated_at`, `position`, `status`. [`timeEntryService.ts`](../../../src/services/timeEntryService.ts) — table `project_time_entries`.
- **Module doc:** [`docs/02-modules/project-tasks.md`](../../../docs/02-modules/project-tasks.md).

## Shipped artifacts (database / docs)

- **SQL (tasks):** [`docs/03-database/sql/project-tasks.sql`](../../03-database/sql/project-tasks.sql)
- **SQL (time + budgets):** [`docs/03-database/sql/project-time-entries.sql`](../../03-database/sql/project-time-entries.sql), [`docs/03-database/sql/project-budget-columns.sql`](../../03-database/sql/project-budget-columns.sql)
- **Contract (tasks):** [`docs/03-database/project-tasks-schema-contract.md`](../../03-database/project-tasks-schema-contract.md)
- **Select filters (title):** [`docs/03-database/project-tasks-select-filters.md`](../../03-database/project-tasks-select-filters.md)
- **Contracts (time/budget):** [`project-time-entries-schema-contract.md`](../../03-database/project-time-entries-schema-contract.md), [`project-budget-columns-contract.md`](../../03-database/project-budget-columns-contract.md)
- **Cross-link:** [`docs/project-database-schema.md`](../../project-database-schema.md) (sections 9–10)

## MCP / environments

- **Cursor server id:** `project-0-foro-skaftin` (see repo `.cursor/mcp.json`).
- **Baseline:** `list_tables` / `get_table_schema` documented in the contract; **other Skaftin projects** must run the same DDL (or MCP) before the app can persist tasks.

## Changelog

### 2026-05-15 (phase 8b — portal route + timeline overdue)

- **Portal:** public [`/portal`](../../../src/App.tsx) — [`PortalLandingPage`](../../../src/pages/portal/PortalLandingPage.tsx) (copy only; no portal sessions).
- **Timeline:** **Overdue** (open tasks with `due_on` before local today) + **Today** label; Vitest updates in [`ProjectTasksTimeline.test.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.test.tsx).

### 2026-05-15 (phase 8a — timeline + architecture)

- **Timeline:** third task view **List \| Board \| Timeline** on [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx); [`ProjectTasksTimeline`](../../../src/pages/admin/companies/ProjectTasksTimeline.tsx) + [`ProjectTasksTimeline.test.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.test.tsx).
- **Docs:** [project-phase8-portal-gantt-automation.md](../../../docs/02-modules/project-phase8-portal-gantt-automation.md); [phase-08](./phase-08-portal-gantt-automation.md) status update; [teams-permissions-model.md](../../../docs/01-roles/teams-permissions-model.md) portal forward plan.

### 2026-05-15 (full billable rollup, invoice hours line, timer)

- **Rollup:** `sumBillableMinutesForProject` walks pages until short read or scan cap (`MAX_BILLABLE_ROLLUP_ROWS`).
- **Invoice:** “Add billable time as line item” + fractional **hours** in [LineItemsEditor](../../../src/components/documents/LineItemsEditor.tsx); optional unit price from project **budget_amount / budget_hours**.
- **Timer:** [ProjectDetailPage](../../../src/pages/admin/companies/ProjectDetailPage.tsx) — `localStorage` timer + Vitest-friendly invoice mocks ([InvoiceForm.test.tsx](../../../src/components/elements/InvoiceForm.test.tsx)).

### 2026-05-14 (phase 7 DDL on MCP + invoice rollup tests)

- **Skaftin (Cursor `project-0-foro-skaftin`):** applied `project_time_entries` (table + indexes) and `projects.budget_hours` / `budget_amount` via MCP `execute_sql` (one statement per call); verified with `get_table_schema`.
- **Code:** paginated [`sumBillableMinutesForProject`](../../../src/services/timeEntryService.ts) (full rollup with scan cap); [`InvoiceForm.test.tsx`](../../../src/components/elements/InvoiceForm.test.tsx) + [`timeEntryService.test.ts`](../../../src/services/timeEntryService.test.ts).

### 2026-05-14 (phase 7 MVP + task title search)

- **Phase 7 MVP:** `project_time_entries` + optional `projects.budget_hours` / `budget_amount` (docs + services); **Budget and time** on project detail; **invoice form** billable-time summary when a project is selected.
- **Tasks:** list **title** filter uses server `where.title` + `ilike` with [`escapeIlikePattern`](../../../src/utils/sqlLikePattern.ts); see [project-tasks-select-filters.md](../../03-database/project-tasks-select-filters.md).
- **Tests:** [`ProjectDetailPage.test.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.test.tsx); `projectTimeEntryCreateSchema` in [`schemas.test.ts`](../../../src/validation/schemas.test.ts).

### 2026-05-14 (phase 6 closed + product gaps)

- **Phase 6 done:** `/app/tasks` **My tasks** (current business + assignee = me), sidebar + breadcrumb; **RTL** tests for `MyTasksPage`.
- **Project detail:** tasks fetch **50 per page** with **Load more**; **status** filter in Skaftin `where`; **description + priority** on create and list; title search moved to **server `ilike`** (see phase 7 changelog).
- **Phase 4 doc:** create **description/priority** marked shipped in [phase-04](./phase-04-task-list.md).

### 2026-05-14 (phase 5 position + sortable)

- **Phase 5 complete:** Kanban uses **sortable** cards per column; drag end recomputes **`position`** (and **`status`** when changing column), batches PATCHes; [`projectKanbanReorder`](../../../src/utils/projectKanbanReorder.ts) + unit tests.

### 2026-05-14 (phase 4 list filters)

- **Phase 4 complete:** List view **status** filter (All + each status), **title** search (client-side), clear controls; table caption reports filtered count. Board view unchanged (all tasks).

### 2026-05-14 (phase 6 polish)

- **Phase 6:** Assignee `<select>` (create + list rows) limited to **active** team members + Unassigned; `fetchTeamMembers` when `business_id` is known; task load **cap 100** with UI note; a11y improvements on table and board; Kanban **keyboard + touch** sensors; **“my tasks”** deferred (documented in hub + module doc).

### 2026-05-14 (later)

- **Phase 5 (Kanban) MVP:** List/Board toggle, `ProjectTasksKanban`, dnd-kit drag between status columns, `TaskService` typing for `updated_at` on update.
- **Cursor rule:** [`.cursor/rules/project-plan-updates.mdc`](../../../.cursor/rules/project-plan-updates.mdc) — how to maintain this progress log and phase docs.

### 2026-05-14

- Integrated **Phases 1–4** (MVP list): DB table, access layer, project detail route, task CRUD UI, module doc.
- DDL applied via MCP on the connected Foro schema; indexes created.

## Next actions (suggested order)

1. **Optional:** timers UI; server-side rollup for billable minutes (avoid row-cap approximation).
2. **Product:** Phase 8+ planning ([phase-08-portal-gantt-automation.md](./phase-08-portal-gantt-automation.md)).

_Update this file when a phase status changes or a notable milestone lands._
