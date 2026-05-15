# Project & task management — implementation hub

**Vision and backlog:** [../README.md](../README.md) in this folder.

**Parent summary:** [../project-task-management.md](../project-task-management.md) (one-page pointer + goals).

Work is split into **sequential implementation phases**. Complete and merge each phase before starting the next unless a later phase file explicitly allows safe parallel prep.

**Progress log:** [PROGRESS.md](./PROGRESS.md)

| Phase | File | Focus | Status |
|-------|------|--------|--------|
| 1 | [phase-01-schema-contract.md](./phase-01-schema-contract.md) | Skaftin schema, migrations, documented contract | Done |
| 2 | [phase-02-access-layer.md](./phase-02-access-layer.md) | Types, Zod, `TaskService` | Done |
| 3 | [phase-03-project-detail.md](./phase-03-project-detail.md) | Project detail route/shell, navigation from projects list | Done |
| 4 | [phase-04-task-list.md](./phase-04-task-list.md) | Task list CRUD, filters, due dates | Done |
| 5 | [phase-05-kanban.md](./phase-05-kanban.md) | Status columns, drag-and-drop, server sync | Done |
| 6 | [phase-06-polish.md](./phase-06-polish.md) | Assignment UX, a11y, mobile, tests | Done |
| 7+ | [phase-07-time-budgets-billing.md](./phase-07-time-budgets-billing.md) | Time entries, budgets, invoice billable summary (MVP shipped) | **MVP done** |
| 8+ | [phase-08-portal-gantt-automation.md](./phase-08-portal-gantt-automation.md) | Timeline + `/portal` shell; portal/automation forward architecture | **8a–8b done** (scoped portal + full Gantt + automation still open) |
| 9+ | [phase-09-analytics.md](./phase-09-analytics.md) | Post-MVP wave (dashboards, insights) | Planning |

## Goals (all phases)

- Company → project → tasks, aligned with invoices/quotations (`project_id` already exists on documents).
- Confirm every schema and request shape with **Skaftin MCP** (`list_tables`, `get_table_schema`, …) and existing table services before relying on it in code ([skaftin-docs-and-schema-verification.mdc](../../../.cursor/rules/skaftin-docs-and-schema-verification.mdc)). In Cursor, the MCP server may appear as **`project-0-foro-skaftin`** (see `.cursor/mcp.json`).

## Skaftin MCP (refined)

Use **`list_tables`** and **`get_table_schema`** before and after migrations. For this Foro project, validation showed **no `businesses` table**; `project_tasks.business_id` is intentionally **not** FK-linked ([project-tasks-schema-contract.md](../../03-database/project-tasks-schema-contract.md)). The **`project_tasks`** table has been created on the MCP-connected schema; **re-apply and re-verify** for any other Skaftin project or database.

## Current state in the repo

| Area | Status |
|------|--------|
| Projects | `Project` type, `ProjectService`, `CompanyProjectsPage`, `/app/companies/:id/projects` |
| Project detail | `/app/companies/:id/projects/:projectId`, [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx) |
| Documents | Optional `project_id` on invoices and quotations |
| DB notes | [project-database-schema.md](../../project-database-schema.md), [project-tasks-schema-contract.md](../../03-database/project-tasks-schema-contract.md) |
| Tasks | `TaskService`, **List \| Board \| Timeline** on [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx) ([`ProjectTasksTimeline`](../../../src/pages/admin/companies/ProjectTasksTimeline.tsx)); **My tasks** [`/app/tasks`](../../../src/App.tsx); paged list; server **status** + **debounced title** filters; **`position`** on board drag |
| Phase 8 hub | [project-phase8-portal-gantt-automation.md](../../02-modules/project-phase8-portal-gantt-automation.md) — **`/portal`** stub + portal / full Gantt / automation forward plan |
| Time & budgets | `project_time_entries` + optional `budget_hours` / `budget_amount` on `projects`; UI + [`TimeEntryService`](../../../src/services/timeEntryService.ts) on project detail; billable rollup on [`InvoiceForm`](../../../src/components/elements/InvoiceForm.tsx) |

## Open questions (resolve before or during early phases)

1. ~~Deleting a project: cascade tasks vs block~~ — **Resolved:** `ON DELETE CASCADE` on `project_id` ([project-tasks-schema-contract.md](../../03-database/project-tasks-schema-contract.md)).
2. ~~Task **status** enum~~ — **Resolved for MVP:** Zod + DB CHECK use `todo`, `in_progress`, `review`, `blocked`, `done`.
3. **Cross-project** “my tasks” in global nav: **Shipped** as [`/app/tasks`](../../../src/App.tsx) — tasks in the **current business** where `assigned_to_user_id` is the signed-in user ([`MyTasksPage`](../../../src/pages/admin/tasks/MyTasksPage.tsx)).
4. Kanban **ordering**: `position` column — **implemented:** board drag recomputes contiguous `position` per status column and PATCHes affected rows; list/board load with `orderBy: position` ASC.

## References

- [`.cursor/rules/project-plan-updates.mdc`](../../../.cursor/rules/project-plan-updates.mdc) — when and how to update this plan + PROGRESS.
- [project-database-schema.md](../../project-database-schema.md)
- [02-modules/ui-data-tables.md](../../02-modules/ui-data-tables.md)
- [02-modules/teams-invitations-and-memberships.md](../../02-modules/teams-invitations-and-memberships.md)
- [01-roles/teams-permissions-model.md](../../01-roles/teams-permissions-model.md)
