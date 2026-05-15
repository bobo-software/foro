# Phase 8: Client portal, Gantt, automation

**Status:** **Done (frontend)** — server-only items deferred to [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md). **Progress:** [PROGRESS.md](./PROGRESS.md).

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
- **Portal route shell:** public [`/portal`](../../../src/App.tsx) — [`PortalLandingPage.tsx`](../../../src/pages/portal/PortalLandingPage.tsx). Vitest: [`PortalLandingPage.test.tsx`](../../../src/pages/portal/PortalLandingPage.test.tsx).

## Shipped (8c) — MCP-validated tables + MVP UI

- **Schema (MCP `execute_sql` + `get_table_schema` on `project-0-foro-skaftin`):** `project_task_dependencies`, `automation_rules`, `portal_invites`. DDL in [sql/](../../../docs/03-database/sql/) and contracts under [docs/03-database/](../../../docs/03-database/).
- **Services:** [`taskDependencyService.ts`](../../../src/services/taskDependencyService.ts), [`automationRuleService.ts`](../../../src/services/automationRuleService.ts), [`portalInviteService.ts`](../../../src/services/portalInviteService.ts); hashing [`sha256Hex.ts`](../../../src/utils/sha256Hex.ts).
- **Project detail:** [`ProjectTaskDependenciesCard.tsx`](../../../src/pages/admin/companies/ProjectTaskDependenciesCard.tsx), [`ProjectPortalInvitesCard.tsx`](../../../src/pages/admin/companies/ProjectPortalInvitesCard.tsx), [`ProjectAutomationRulesCard.tsx`](../../../src/pages/admin/companies/ProjectAutomationRulesCard.tsx) on [`ProjectDetailPage.tsx`](../../../src/pages/admin/companies/ProjectDetailPage.tsx).
- **Timeline:** optional **“After: …”** predecessor hints from loaded dependencies.
- **Portal read view:** [`/portal/v/:portalToken`](../../../src/App.tsx) — [`PortalProjectViewPage.tsx`](../../../src/pages/portal/PortalProjectViewPage.tsx) (read-only timeline + tasks; uses same Skaftin client as the SPA — see [portal-invites-schema-contract.md](../../03-database/portal-invites-schema-contract.md)).

## Shipped (8d-lite) — automation toasts + portal SPA polish

- **Runner:** [`automationTriggerRunner.ts`](../../../src/services/automationTriggerRunner.ts) — `task_status_done`, **`task_status_changed`**, and **`task_created`** + `action: "toast"` after list save / Kanban / create.
- **Portal (client):** [`PortalProjectViewPage.tsx`](../../../src/pages/portal/PortalProjectViewPage.tsx) — trimmed token, safer error copy, skeleton loading, company load isolated; [`usePortalNoIndex.ts`](../../../src/hooks/usePortalNoIndex.ts) on `/portal` and `/portal/v/…` (`noindex, nofollow`).
- **UX copy:** examples + definition presets on [ProjectAutomationRulesCard.tsx](../../../src/pages/admin/companies/ProjectAutomationRulesCard.tsx).

## Shipped (8e) — Gantt polish + portal pagination (frontend closure)

- **Timeline:** month **Gantt markers** (`showGanttBars`), **Blocked by:** hints from open predecessors ([`projectTaskBlockedBy.ts`](../../../src/utils/projectTaskBlockedBy.ts)), **Export timeline (CSV)** ([`projectTimelineCsv.ts`](../../../src/utils/projectTimelineCsv.ts)).
- **Portal view:** paged task load (**50** per page) + **Load more tasks**; **Print**; timeline export on portal.
- **Portal invites:** **mailto:** helper after creating a link (client-side only; no server email).

## Deferred to backend (not Phase 8 frontend)

See [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md): RLS / scoped portal keys, invite email delivery, server aggregates, cron automation, drag-resize Gantt with duration columns, webhooks.

## Deliverables when extending Phase 8

- [x] MCP-validated schema + contracts for `project_task_dependencies`, `automation_rules`, `portal_invites` (8c).
- [x] Update this file and [project-phase8-portal-gantt-automation.md](../../02-modules/project-phase8-portal-gantt-automation.md).
- [ ] Expand [teams-permissions-model.md](../../01-roles/teams-permissions-model.md) when concrete portal roles exist (beyond design constraints).

## Out of scope here

- Cross-business analytics and AI features (see [phase-09-analytics.md](./phase-09-analytics.md) and vision “Phase 4”).
