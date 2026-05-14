# Phase 6: Polish & hardening

**Prerequisite:** [phase-05-kanban.md](./phase-05-kanban.md) (or phase 4 if Kanban is intentionally deferred—then adjust scope).

**Blocks:** None for core PM MVP; see phase 7+ for product expansion.

## Objective

Raise quality of the shipped task module: assignment, accessibility, responsive layout, and automated tests—without expanding feature scope into time tracking or portal.

## Deliverables

- [ ] **Assignment**: picker limited to business members; invalid id handling; optional unassign. Cross-check [teams-invitations-and-memberships.md](../../02-modules/teams-invitations-and-memberships.md).
- [ ] **Mobile**: usable list and board (scroll, touch targets); simplify board on narrow viewports if needed.
- [ ] **Accessibility**: focus order, labels on inputs, live region or toast for errors, ARIA roles on board where applicable.
- [ ] **RTL tests**: create task from UI; move Kanban card (if implemented); regression on project detail guard.
- [ ] **Performance**: reasonable limit on task fetch (pagination or cap + “load more”) if projects can have many tasks—document choice.

## Documentation

- [ ] `docs/01-roles/` only if a new permission or restriction was introduced.
- [ ] Final pass on `docs/02-modules/` and `docs/03-database/` for accuracy vs shipped behavior.

## Exit criteria

- PM MVP is merge-ready: no known P0/P1 UX or auth bugs on happy path.
- **Open question** #3: either implement minimal “my tasks” cross-project view or explicitly defer with doc note.

## Out of scope

- Time tracking, budgets, notifications (phase 7+).
