# Project & task management — progress log

Single place to see **what shipped**, **what is in progress**, and **what is next**. Phase specs live in [README.md](./README.md) and `phase-*.md` in this folder.

How to update this doc when shipping PM work: see repo rule **[`.cursor/rules/project-plan-updates.mdc`](../../../.cursor/rules/project-plan-updates.mdc)**.

| Last reviewed | 2026-05-18 |
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
| [8](./phase-08-portal-gantt-automation.md) | **Done (frontend)** | **8a–8e:** timeline + deps + portal + automation toasts + Gantt markers + blocked-by + timeline CSV + portal load-more/print/mailto. Server work: [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md). |
| [9](./phase-09-analytics.md) | **9a–9c done** | Insights card, loaded CSV export, **`/app/projects`** overview ([`ProjectsOverviewPage`](../../../src/pages/admin/projects/ProjectsOverviewPage.tsx)). Backend: [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md). |

## Shipped artifacts (code)

- **Routes:** [`App.tsx`](../../../src/App.tsx) — `companies/:id/projects/:projectId` before `companies/:id/projects`; public **`/portal`** + **`/portal/v/:portalToken`** (client portal).
- **UI:** [`ProjectDetailPage.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.tsx) — project guard, **Insights** card (Phase 9a), **budget and time** card (**full billable rollup** via `sumBillableMinutesForProject` + **time entries:** 50-row pages + **Load more**), **List / Board / Timeline** tasks, **task dependencies** + **portal invites** + **automation rules** cards, create / save / delete, **paged task load** + **Load more**, server **status** + **debounced title** `where`, **description/priority** fields.
- **Timeline:** [`ProjectTasksTimeline.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.tsx); Vitest [`ProjectTasksTimeline.test.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.test.tsx).
- **Portal:** [`PortalLandingPage.tsx`](../../../src/pages/portal/PortalLandingPage.tsx), [`PortalProjectViewPage.tsx`](../../../src/pages/portal/PortalProjectViewPage.tsx); Vitest [`PortalLandingPage.test.tsx`](../../../src/pages/portal/PortalLandingPage.test.tsx).
- **Phase 8 cards:** [`ProjectTaskDependenciesCard.tsx`](../../../src/pages/admin/companies/ProjectTaskDependenciesCard.tsx), [`ProjectPortalInvitesCard.tsx`](../../../src/pages/admin/companies/ProjectPortalInvitesCard.tsx), [`ProjectAutomationRulesCard.tsx`](../../../src/pages/admin/companies/ProjectAutomationRulesCard.tsx).
- **Phase 9a:** [`ProjectInsightsCard.tsx`](../../../src/pages/admin/companies/ProjectInsightsCard.tsx); [`localDateISO.ts`](../../../src/utils/localDateISO.ts); [`automationTriggerRunner.ts`](../../../src/services/automationTriggerRunner.ts) (task-done + **task-created** toasts) + Vitest [`automationTriggerRunner.test.ts`](../../../src/services/automationTriggerRunner.test.ts); [`usePortalNoIndex.ts`](../../../src/hooks/usePortalNoIndex.ts); portal Vitest [`PortalProjectViewPage.test.tsx`](../../../src/pages/portal/PortalProjectViewPage.test.tsx).
- **Services:** [`taskDependencyService.ts`](../../../src/services/taskDependencyService.ts), [`portalInviteService.ts`](../../../src/services/portalInviteService.ts), [`automationRuleService.ts`](../../../src/services/automationRuleService.ts); [`sha256Hex.ts`](../../../src/utils/sha256Hex.ts) + Vitest [`sha256Hex.test.ts`](../../../src/utils/sha256Hex.test.ts).
- **My tasks:** [`MyTasksPage.tsx`](../../../src/pages/admin/tasks/MyTasksPage.tsx) — `/app/tasks`; Vitest [`MyTasksPage.test.tsx`](../../../src/pages/admin/tasks/MyTasksPage.test.tsx).
- **Project detail tests:** [`ProjectDetailPage.test.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.test.tsx) — debounced title `ilike`, filter empty copy.
- **Invoice form tests:** [`InvoiceForm.test.tsx`](../../../src/components/elements/InvoiceForm.test.tsx) — billable summary + append line.
- **Time entry rollup test:** [`timeEntryService.test.ts`](../../../src/services/timeEntryService.test.ts) — multi-page `sumBillableMinutesForProject`.
- **Kanban:** [`ProjectTasksKanban.tsx`](../../../src/pages/admin/companies/ProjectTasksKanban.tsx) — `@dnd-kit/core` + `@dnd-kit/sortable` (`SortableContext`, `useSortable`), `@dnd-kit/utilities`; reorder math in [`projectKanbanReorder.ts`](../../../src/utils/projectKanbanReorder.ts) (+ Vitest).
- **Assignee helpers:** [`projectTaskAssignee.ts`](../../../src/utils/projectTaskAssignee.ts) (+ Vitest).
- **Data:** [`taskService.ts`](../../../src/services/taskService.ts) — `project_tasks`; [`timeEntryService.ts`](../../../src/services/timeEntryService.ts) — `project_time_entries`; [`taskDependencyService.ts`](../../../src/services/taskDependencyService.ts), [`portalInviteService.ts`](../../../src/services/portalInviteService.ts), [`automationRuleService.ts`](../../../src/services/automationRuleService.ts) — Phase 8 tables.
- **Module doc:** [`docs/02-modules/project-tasks.md`](../../../docs/02-modules/project-tasks.md).

## Shipped artifacts (database / docs)

- **SQL (tasks):** [`docs/03-database/sql/project-tasks.sql`](../../03-database/sql/project-tasks.sql)
- **SQL (time + budgets):** [`docs/03-database/sql/project-time-entries.sql`](../../03-database/sql/project-time-entries.sql), [`docs/03-database/sql/project-budget-columns.sql`](../../03-database/sql/project-budget-columns.sql)
- **Contract (tasks):** [`docs/03-database/project-tasks-schema-contract.md`](../../03-database/project-tasks-schema-contract.md)
- **Select filters (title):** [`docs/03-database/project-tasks-select-filters.md`](../../03-database/project-tasks-select-filters.md)
- **Contracts (time/budget):** [`project-time-entries-schema-contract.md`](../../03-database/project-time-entries-schema-contract.md), [`project-budget-columns-contract.md`](../../03-database/project-budget-columns-contract.md)
- **SQL (Phase 8):** [`project-task-dependencies.sql`](../../03-database/sql/project-task-dependencies.sql), [`automation-rules.sql`](../../03-database/sql/automation-rules.sql), [`portal-invites.sql`](../../03-database/sql/portal-invites.sql)
- **Contracts (Phase 8):** [`project-task-dependencies-schema-contract.md`](../../03-database/project-task-dependencies-schema-contract.md), [`automation-rules-schema-contract.md`](../../03-database/automation-rules-schema-contract.md), [`portal-invites-schema-contract.md`](../../03-database/portal-invites-schema-contract.md)
- **Cross-link:** [`docs/project-database-schema.md`](../../project-database-schema.md) (sections 9–11)

## MCP / environments

- **Cursor server id:** `project-0-foro-skaftin` (see repo `.cursor/mcp.json`).
- **Baseline:** `list_tables` / `get_table_schema` documented in the contract; **other Skaftin projects** must run the same DDL (or MCP) before the app can persist tasks.

## Changelog

### 2026-05-15 (phase 8e — frontend closure)

- **Timeline:** Gantt month markers, **Blocked by** hints, **Export timeline (CSV)**; [`projectTaskBlockedBy.ts`](../../../src/utils/projectTaskBlockedBy.ts), [`projectTimelineCsv.ts`](../../../src/utils/projectTimelineCsv.ts).
- **Automation:** `task_status_changed` toasts; definition presets on automation card.
- **Portal:** paged tasks + load more, print, timeline export; invite **mailto:** helper.
- **Docs:** Phase 8 marked **done (frontend)**; server items in [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md).

### 2026-05-15 (backend wishlist doc + phase 9b CSV export)

- **Docs:** [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md) — deferred Skaftin/server features (RLS, portal auth, aggregates, cron automation, email, etc.).
- **9b:** [`csvDownload.ts`](../../../src/utils/csvDownload.ts) + export buttons on [ProjectInsightsCard](../../../src/pages/admin/companies/ProjectInsightsCard.tsx); Vitest [`csvDownload.test.ts`](../../../src/utils/csvDownload.test.ts).

### 2026-05-15 (task_created toasts, billable rollup on project detail, portal SPA hardening)

- **Automation:** [`notifyTaskCreatedAutomation`](../../../src/services/automationTriggerRunner.ts) after successful task create; [`collectTaskCreatedToastMessages`](../../../src/services/automationTriggerRunner.ts) + Vitest.
- **Time:** project detail loads [`sumBillableMinutesForProject`](../../../src/services/timeEntryService.ts) for budget line + summary (`data-testid` helpers); refresh after log time / timer save.
- **Portal:** [`usePortalNoIndex`](../../../src/hooks/usePortalNoIndex.ts); [PortalProjectViewPage](../../../src/pages/portal/PortalProjectViewPage.tsx) token trim, generic catch copy, skeleton loader, company fetch isolated; Vitest [`PortalProjectViewPage.test.tsx`](../../../src/pages/portal/PortalProjectViewPage.test.tsx).
- **Docs:** phase-8 hub + [project-tasks.md](../../../docs/02-modules/project-tasks.md).

### 2026-05-15 (time entries — load more on project detail)

- **Code:** [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx) — time entries fetched in **50-row** pages with **Load more time entries** (newest first); insights / budget copy use the accumulated in-memory list.
- **Docs:** [project-tasks.md](../../../docs/02-modules/project-tasks.md), [project-insights-analytics.md](../../../docs/02-modules/project-insights-analytics.md).

### 2026-05-15 (phase 9a insights + 8d-lite automation toast)

- **Insights:** [`ProjectInsightsCard`](../../../src/pages/admin/companies/ProjectInsightsCard.tsx) on project detail — loaded-task/time metrics, overdue (local date), optional budget burn bar; [`localDateISO`](../../../src/utils/localDateISO.ts) shared with timeline.
- **Automation:** [`notifyTaskMarkedDoneAutomation`](../../../src/services/automationTriggerRunner.ts) after list save + Kanban when status becomes **done**; `task_status_done` + toast `definition` in UI copy on [`ProjectAutomationRulesCard`](../../../src/pages/admin/companies/ProjectAutomationRulesCard.tsx).
- **Docs:** [project-insights-analytics.md](../../../docs/02-modules/project-insights-analytics.md); phase-08/09 + hub updates.

### 2026-05-15 (phase 8c — dependencies, automation rules, portal read)

- **Skaftin MCP:** created `project_task_dependencies`, `automation_rules`, `portal_invites` (+ indexes); verified `get_table_schema`.
- **Code:** services + project detail cards + [`/portal/v/:portalToken`](../../../src/App.tsx) [`PortalProjectViewPage`](../../../src/pages/portal/PortalProjectViewPage.tsx); timeline **After** hints; Zod + Vitest for new schemas / [`sha256Hex`](../../../src/utils/sha256Hex.ts).
- **Docs:** SQL + contracts; [project-database-schema.md](../../../docs/project-database-schema.md) §11; phase-08 + hub updates.

### 2026-05-18 (task checklists)

- **Schema:** `project_task_checklists`, `project_task_checklist_items` — [project-task-checklists-schema-contract.md](../../../docs/03-database/project-task-checklists-schema-contract.md); applied on connected Skaftin via MCP.
- **Code:** [`TaskChecklistService`](../../../src/services/taskChecklistService.ts), [`TaskChecklistsSection`](../../../src/components/tasks/TaskChecklistsSection.tsx) in [`EditTaskModal`](../../../src/components/modals/EditTaskModal.tsx); Vitest for service + section.
- **Docs:** [project-tasks.md](../../../docs/02-modules/project-tasks.md) UI + data sections.

### 2026-05-15 (phase 9c — business projects overview)

- **Route:** `/app/projects` — [`ProjectsOverviewPage`](../../../src/pages/admin/projects/ProjectsOverviewPage.tsx); sidebar **Projects**; aggregates via [`projectOverviewMetrics.ts`](../../../src/utils/projectOverviewMetrics.ts).
- **Data:** paged task scan (cap 3000) + per-project billable rollup; overview CSV export; Vitest in [`ProjectsOverviewPage.test.tsx`](../../../src/pages/admin/projects/ProjectsOverviewPage.test.tsx).

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

## Next actions (suggested order, frontend)

1. **Backend (when ready):** pick from [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md) — portal RLS, `SUM` aggregates, invite email, cron runner, drag-resize Gantt schema.
2. **Phase 9+ (optional):** charts (ApexCharts), AI summaries — see [phase-09-analytics.md](./phase-09-analytics.md).

_Update this file when a phase status changes or a notable milestone lands._
