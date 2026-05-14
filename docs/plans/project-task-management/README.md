# Project & task management — implementation hub

**Vision and backlog:** [../README.md](../README.md) in this folder.

**Parent summary:** [../project-task-management.md](../project-task-management.md) (one-page pointer + goals).

Work is split into **sequential implementation phases**. Complete and merge each phase before starting the next unless a later phase file explicitly allows parallel prep.

| Phase | File | Focus |
|-------|------|--------|
| 1 | [phase-01-schema-contract.md](./phase-01-schema-contract.md) | Skaftin schema, migrations, documented contract |
| 2 | [phase-02-access-layer.md](./phase-02-access-layer.md) | Types, Zod, `TaskService` |
| 3 | [phase-03-project-detail.md](./phase-03-project-detail.md) | Project detail route/shell, navigation from projects list |
| 4 | [phase-04-task-list.md](./phase-04-task-list.md) | Task list CRUD, filters, due dates |
| 5 | [phase-05-kanban.md](./phase-05-kanban.md) | Status columns, drag-and-drop, optimistic updates |
| 6 | [phase-06-polish.md](./phase-06-polish.md) | Assignment UX, a11y, mobile, tests |
| 7+ | [phase-07-time-budgets-billing.md](./phase-07-time-budgets-billing.md) | Post-MVP wave (time, budgets, invoice hooks) |
| 8+ | [phase-08-portal-gantt-automation.md](./phase-08-portal-gantt-automation.md) | Post-MVP wave (portal, Gantt, automation) |
| 9+ | [phase-09-analytics.md](./phase-09-analytics.md) | Post-MVP wave (dashboards, insights) |

## Goals (all phases)

- Company → project → tasks, aligned with invoices/quotations (`project_id` already exists on documents).
- Confirm every schema and request shape with **Skaftin MCP** and **client-sdk** before relying on it in code ([skaftin-docs-and-schema-verification.mdc](../../../.cursor/rules/skaftin-docs-and-schema-verification.mdc)).

## Current state in the repo

| Area | Status |
|------|--------|
| Projects | `Project` type, `ProjectService`, `CompanyProjectsPage`, `/app/companies/:id/projects` |
| Documents | Optional `project_id` on invoices and quotations |
| DB notes | [project-database-schema.md](../../project-database-schema.md) |
| Tasks | Not implemented |

## Open questions (resolve before or during early phases)

1. Deleting a project: **cascade** tasks vs **block** until tasks archived?
2. Task **status** enum: full Kanban set vs minimal MVP states?
3. **Cross-project** “my tasks” in global nav: defer or include after phase 4?
4. Kanban **ordering**: `sort_order` / `position` column vs sort by `updated_at` only?

## References

- [project-database-schema.md](../../project-database-schema.md)
- [02-modules/ui-data-tables.md](../../02-modules/ui-data-tables.md)
- [02-modules/teams-invitations-and-memberships.md](../../02-modules/teams-invitations-and-memberships.md)
- [01-roles/teams-permissions-model.md](../../01-roles/teams-permissions-model.md)
