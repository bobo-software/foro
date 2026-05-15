# Phase 8: Client portal, Gantt, automation

**Status:** **Phase 8a–8b shipped** (timeline + portal shell; full portal/Gantt/automation still open). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** Phase 7 MVP or a product decision to reorder; typically **after** core internal PM + time/budgets are stable.

**Vision reference:** [../README.md](../README.md) — “Phase 3” (client portal, Gantt, automation, analytics dashboards overlap).

## Objective

Expand outward: **external** visibility (client portal), **planning** views (Gantt/timeline), and **rules** (automation) that reduce manual updates.

## Shipped (8a)

- **Timeline (Gantt slice):** third task view on project detail — read-only schedule by `due_on`, month headings, unscheduled bucket. Code: [`ProjectTasksTimeline.tsx`](../../../src/pages/admin/companies/ProjectTasksTimeline.tsx), wired in [`ProjectDetailPage.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.tsx); persisted in `localStorage` with list/board (`foro_project_tasks_view_<projectId>`).
- **Architecture hub:** [project-phase8-portal-gantt-automation.md](../../02-modules/project-phase8-portal-gantt-automation.md) (portal + automation forward plan).
- **Roles forward plan:** [teams-permissions-model.md](../../01-roles/teams-permissions-model.md) — “Client portal access (planned)”.

## Shipped (8b)

- **Timeline UX:** **Overdue** block (open tasks with `due_on` before today, local calendar); **Today** label on tasks due today; completed tasks stay in the dated list even when past due.
- **Portal route shell:** public [`/portal`](../../../src/App.tsx) — [`PortalLandingPage.tsx`](../../../src/pages/portal/PortalLandingPage.tsx) explains future scoped client access (no auth or data yet). Vitest: [`PortalLandingPage.test.tsx`](../../../src/pages/portal/PortalLandingPage.test.tsx).

## Suggested workstreams (remaining)

1. **Client portal**: auth model, scoped project read, approvals, file exchange—major security and product design effort.
2. **Gantt / timeline (full)**: dependency graph storage; library choice (e.g. frappe-gantt, FullCalendar timeline); drag-resize durations.
3. **Automation**: event triggers (task completed → notify; quote accepted → seed tasks)—likely needs Skaftin-side hooks or a job runner strategy.

## Deliverables when extending Phase 8

- [ ] MCP-validated schema + contracts for any new tables (`portal_*`, `task_dependencies`, `automation_rules`, …).
- [ ] Update this file and [project-phase8-portal-gantt-automation.md](../../02-modules/project-phase8-portal-gantt-automation.md).
- [ ] Expand [teams-permissions-model.md](../../01-roles/teams-permissions-model.md) when concrete portal roles exist.

## Out of scope here

- Cross-business analytics and AI features (see [phase-09-analytics.md](./phase-09-analytics.md) and vision “Phase 4”).
