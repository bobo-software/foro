# Phase 8: Client portal, Gantt, and automation (hub)

**Plan spec:** [../plans/project-task-management/phase-08-portal-gantt-automation.md](../plans/project-task-management/phase-08-portal-gantt-automation.md). **Progress:** [../plans/project-task-management/PROGRESS.md](../plans/project-task-management/PROGRESS.md).

This module doc is the **architecture and product hub** for work that extends beyond internal project/task CRUD: external clients, planning visuals, and automated reactions.

## What shipped in-repo

### Phase 8a — timeline slice

- **Timeline view** on [ProjectDetailPage](../../src/pages/admin/companies/ProjectDetailPage.tsx) via [ProjectTasksTimeline](../../src/pages/admin/companies/ProjectTasksTimeline.tsx): read-only ordering by **`due_on`**, month sub-headings, **Unscheduled** bucket for tasks without a due date. Uses the **same loaded task pages** as List/Board (filters + Load more still apply before switching views).

This is intentionally **not** a full Gantt (no dependencies, no drag-resize, no critical path).

### Phase 8b — portal URL + timeline polish

- **Public `/portal`** route in [App.tsx](../../src/App.tsx) → [PortalLandingPage](../../src/pages/portal/PortalLandingPage.tsx): explains future client access; **no authentication or project data** yet.
- **Timeline:** **Overdue** section (open tasks whose `due_on` is before the viewer’s local calendar date) and a **Today** label when the due date equals today; tasks marked **done** stay in the main dated list even if the due date is in the past.

## Workstream 1: Client portal (not shipped)

Goals: scoped **read** (and later **approve**) access for customers without full app accounts.

**Likely building blocks (future):**

- **Identity:** magic links, short-lived JWTs, or OAuth-style “portal session” bound to `company_id` + `project_id`.
- **Data scope:** server-side row filters (never rely on UI-only hiding); optional `portal_invites` / `portal_sessions` tables after MCP + contract pass.
- **Surface:** route prefix **`/portal`** (landing stub shipped); later `/portal/:token` or subdomain; minimal UI bundle for real sessions.

**Roles:** see [Client portal access (planned)](../01-roles/teams-permissions-model.md#client-portal-access-planned) in the teams model doc.

## Workstream 2: Gantt / timeline (partial)

**Done (MVP):** Timeline by due date, **Overdue** / **Today** / **Unscheduled** (see Phase 8a–8b above).

**Later:** dependency edges (`task_dependencies` or similar), duration-based bars, resource lanes, export — each needs schema + MCP validation before implementation.

## Workstream 3: Automation (not shipped)

Goals: “when **X** happens, do **Y**” (e.g. task → `done` → notify assignee; quotation accepted → seed tasks).

**Likely building blocks:**

- **Triggers:** app events today; durable execution may need Skaftin **cron**, webhooks, or an external job worker.
- **Storage:** `automation_rules` (JSON conditions/actions) after contract pass — **do not invent** table shapes until MCP + `client-sdk` patterns are checked.

## Verification workflow

Same as other phases: [skaftin-docs-and-schema-verification.mdc](../../.cursor/rules/skaftin-docs-and-schema-verification.mdc) before any new tables or auth flows land in code.
