# Phase 8: Client portal, Gantt, and automation (hub)

**Plan spec:** [../plans/project-task-management/phase-08-portal-gantt-automation.md](../plans/project-task-management/phase-08-portal-gantt-automation.md). **Progress:** [../plans/project-task-management/PROGRESS.md](../plans/project-task-management/PROGRESS.md).

This module doc is the **architecture and product hub** for work that extends beyond internal project/task CRUD: external clients, planning visuals, and automated reactions.

## What shipped in-repo

### Phase 8a — timeline slice

- **Timeline view** on [ProjectDetailPage](../../src/pages/admin/companies/ProjectDetailPage.tsx) via [ProjectTasksTimeline](../../src/pages/admin/companies/ProjectTasksTimeline.tsx): read-only ordering by **`due_on`**, month sub-headings, **Unscheduled** bucket for tasks without a due date. Uses the **same loaded task pages** as List/Board (filters + Load more still apply before switching views).

This is intentionally **not** a full Gantt (no drag-resize bars, no critical path).

### Phase 8b — portal URL + timeline polish

- **Public `/portal`** route in [App.tsx](../../src/App.tsx) → [PortalLandingPage](../../src/pages/portal/PortalLandingPage.tsx).
- **Timeline:** **Overdue** section (open tasks whose `due_on` is before the viewer’s local calendar date) and a **Today** label when the due date equals today; tasks marked **done** stay in the main dated list even if the due date is in the past.

### Phase 8c — dependencies, automation storage, portal read

- **Tables (MCP-validated):** `project_task_dependencies`, `automation_rules`, `portal_invites` — see [project-database-schema.md](../project-database-schema.md) §11 and per-table contracts in [docs/03-database/](../03-database/).
- **Task dependencies:** CRUD on project detail ([ProjectTaskDependenciesCard](../../src/pages/admin/companies/ProjectTaskDependenciesCard.tsx)); [TaskDependencyService](../../src/services/taskDependencyService.ts). Timeline shows **After: …** predecessor hints when edges exist.
- **Automation rules:** per-project list + create + enable/disable + delete on project detail ([ProjectAutomationRulesCard](../../src/pages/admin/companies/ProjectAutomationRulesCard.tsx)); [AutomationRuleService](../../src/services/automationRuleService.ts). **MVP execution (8d-lite):** toasts from [automationTriggerRunner](../../src/services/automationTriggerRunner.ts) — `notifyTaskMarkedDoneAutomation` when a task becomes **done** (list save or board drag) for `task_status_done` + `action: "toast"`; `notifyTaskCreatedAutomation` when a task is **created** for `task_created` + toast. Other triggers and actions remain future work.
- **Portal invites:** create (14-day expiry, copy link), list, revoke on project detail ([ProjectPortalInvitesCard](../../src/pages/admin/companies/ProjectPortalInvitesCard.tsx)); [PortalInviteService](../../src/services/portalInviteService.ts); tokens hashed with [sha256Hex](../../src/utils/sha256Hex.ts).
- **Public project view:** [`/portal/v/:portalToken`](../../src/App.tsx) → [PortalProjectViewPage](../../src/pages/portal/PortalProjectViewPage.tsx) — read-only company/project header + timeline (up to 200 tasks). Uses the **same Skaftin API credentials** as the bundled SPA; treat as MVP until RLS or scoped keys exist ([portal-invites-schema-contract.md](../03-database/portal-invites-schema-contract.md)). **Client-side hardening:** trimmed/decoded token, generic error copy on unexpected failures, loading skeleton, isolated company fetch failure, [`usePortalNoIndex`](../../src/hooks/usePortalNoIndex.ts) (`noindex, nofollow`) on `/portal` and `/portal/v/…`.

## Workstream 1: Client portal (MVP shipped; hardening open)

Goals: scoped **read** (and later **approve**) access for customers without full app accounts.

**Shipped (8c + SPA hardening):** `portal_invites` rows + `/portal/v/:token` read-only timeline; `usePortalNoIndex`, safer errors/loading on [PortalProjectViewPage](../../src/pages/portal/PortalProjectViewPage.tsx).

**Still open:** dedicated portal auth, RLS / scoped API keys, email delivery, approvals, file exchange.

**Roles:** see [Client portal access (planned)](../01-roles/teams-permissions-model.md#client-portal-access-planned).

## Workstream 2: Gantt / timeline (frontend complete)

**Done:** Timeline by due date, Overdue / Today / Unscheduled, **`project_task_dependencies`** with “After: …” and **“Blocked by: …”** (open predecessors), month **Gantt markers**, **Export timeline (CSV)**.

**Later (backend/schema):** drag-resize durations, critical path, richer graph layout.

## Workstream 3: Automation (frontend toast runner complete)

**Done:** `automation_rules` table + project-detail CRUD; in-browser toasts for **`task_status_done`**, **`task_status_changed`**, and **`task_created`** via [`automationTriggerRunner.ts`](../../src/services/automationTriggerRunner.ts); definition presets on the automation card.

**Later (backend):** email/webhook actions, Skaftin cron, stricter per-trigger `definition` schemas.

## Phase 8 frontend — closed

All planned **SPA** work for Phase 8 is shipped. Remaining portal/Gantt/automation capabilities that need **Skaftin or email infrastructure** are tracked in [BACKEND-WISHLIST-SKAFTIN.md](../plans/project-task-management/BACKEND-WISHLIST-SKAFTIN.md). Proceed to **Phase 9c** (business overview) or backend picks from that wishlist.

## Verification workflow

Same as other phases: [skaftin-docs-and-schema-verification.mdc](../../.cursor/rules/skaftin-docs-and-schema-verification.mdc) before new tables or auth flows land in code.
