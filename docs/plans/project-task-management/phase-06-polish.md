# Phase 6: Polish & hardening

**Status:** Done (2026-05-14). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** [phase-05-kanban.md](./phase-05-kanban.md) (or phase 4 if Kanban is intentionally deferred—then adjust scope).

**Blocks:** None for core PM MVP; see phase 7+ for product expansion.

## Objective

Raise quality of the shipped task module: assignment, accessibility, responsive layout, and automated tests—without expanding feature scope into time tracking or portal.

## Deliverables

- [x] **Assignment**: picker limited to **active** `team_memberships` for the business; validation on create/save; **Unassigned** supported. See [`projectTaskAssignee`](../../../src/utils/projectTaskAssignee.ts) and [teams-invitations-and-memberships.md](../../02-modules/teams-invitations-and-memberships.md).
- [x] **Mobile**: horizontal board scroll with snap, `TouchSensor` (delay) on Kanban, larger touch targets on list/board controls (`ProjectDetailPage`, `ProjectTasksKanban`).
- [x] **Accessibility**: table `caption` / `scope`, `sr-only` labels, `role="alert"` for task errors, List/Board `aria-pressed`, Kanban `role="region"` / column `role="group"` / card `aria-label`; toasts for inline validation where appropriate.
- [x] **RTL tests**: [`MyTasksPage.test.tsx`](../../../src/pages/admin/tasks/MyTasksPage.test.tsx) (empty state + project deep-link); existing unit tests for [`projectTaskAssignee`](../../../src/utils/projectTaskAssignee.test.ts) and [`projectKanbanReorder`](../../../src/utils/projectKanbanReorder.test.ts). Full **`ProjectDetailPage`** + Kanban interaction RTL remains optional follow-up when Skaftin is easier to mock end-to-end.
- [x] **Performance / listing**: project detail loads tasks in **pages of 50** with **Load more**, **server-side status** filter in `where`, client **title** filter on loaded rows; board uses accumulated loaded tasks ([`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx)).

## Documentation

- [ ] `docs/01-roles/` only if a new permission or restriction was introduced. *(No change for assignee picker — same team membership model.)*
- [x] Final pass on `docs/02-modules/` for accuracy vs shipped behavior (`project-tasks.md`).

## Exit criteria

- PM MVP is merge-ready: no known P0/P1 UX or auth bugs on happy path.
- **Open question** #3: **shipped** — cross-business “my tasks” for the **current business** at [`/app/tasks`](../../../src/App.tsx) ([`MyTasksPage`](../../../src/pages/admin/tasks/MyTasksPage.tsx)), sidebar + breadcrumbs.

## Out of scope

- Time tracking, budgets, notifications (phase 7+).
