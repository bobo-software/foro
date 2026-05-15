# Phase 7: Time, budgets, and billing integration

**Status:** MVP slice shipped (manual time + project budgets + invoice billable summary). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** Phases 1–6 complete.

**Vision reference:** [../README.md](../README.md) — “Phase 2” product roadmap (time tracking, project budgets, invoice integration, notifications).

## Shipped in this repo (MVP)

1. **`project_time_entries`** — DDL in [sql/project-time-entries.sql](../../03-database/sql/project-time-entries.sql), contract [project-time-entries-schema-contract.md](../../03-database/project-time-entries-schema-contract.md), [`TimeEntryService`](../../../src/services/timeEntryService.ts), Zod `projectTimeEntryCreateSchema`.
2. **Project budgets** — optional `budget_hours` / `budget_amount` on `projects` ([sql/project-budget-columns.sql](../../03-database/sql/project-budget-columns.sql), [project-budget-columns-contract.md](../../03-database/project-budget-columns-contract.md)); edit + save on [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx).
3. **Manual log time** — form on project detail (minutes, billable, optional task, notes); recent entries table (last 50 loaded). **Browser timer** (Start / Stop & log / Discard) persists in `localStorage` per project + business.
4. **Invoice integration** — [`InvoiceForm`](../../../src/components/elements/InvoiceForm.tsx) shows a **paged billable rollup** (`TimeEntryService.sumBillableMinutesForProject`) and can **append a draft hours line**; needs `business_id` from the project or active business context.

**Operator checklist:** apply the new SQL on each Skaftin environment and run `get_table_schema` for `project_time_entries` and `projects` (budget columns), same as earlier `project_tasks` workflow. If you use MCP `execute_sql`, run **one statement per call** (multi-statement scripts can fail with prepared-statement limits).

## Deferred / later PRs

- **Background / mobile timers** (push, sync across devices).
- **Budget burn** from full rollup vs `budget_hours` on project detail (today the burn line still uses the last loaded entries window only).
- **Notifications** (see roadmap).

## Workflow reminder

Each new submodule still needs **Skaftin MCP + client-sdk** verification before expanding request shapes ([skaftin-docs-and-schema-verification.mdc](../../../.cursor/rules/skaftin-docs-and-schema-verification.mdc)).

## Out of scope here

- Client portal, Gantt, automation (see [phase-08-portal-gantt-automation.md](./phase-08-portal-gantt-automation.md)).
