# Phase 1: Schema & contract

**Prerequisite:** None (first implementation slice).

**Blocks:** [phase-02-access-layer.md](./phase-02-access-layer.md).

## Objective

Introduce the task persistence layer in Skaftin and lock the **authoritative** column list, types, indexes, and FK behavior in repo docs—without building the app UI yet.

## Workflow (required)

1. Use **Skaftin MCP** to inspect current `projects` / `businesses` tables and naming conventions.
2. Read **client-sdk** / existing `ProjectService` request patterns so new table operations match established shapes.
3. Design migration(s); apply in Skaftin; re-verify with MCP.

## Proposed direction (verify, do not assume)

- Table name: e.g. `project_tasks` or `tasks` (pick one and stick to it after MCP check).
- Columns (conceptual): `id`, `business_id`, `project_id`, `title`, optional `description`, `status`, optional `priority`, optional `due_date`, optional `assigned_to`, timestamps; optional `sort_order` if phase 5 needs stable ordering.
- FK: `project_id` → `projects.id`; align `business_id` with how `projects` scopes tenants.
- Indexes: at minimum `(project_id)`, `(business_id, project_id)`; add `(assigned_to)` / `(due_date)` if queries need them.

## Deliverables

- [ ] Migration applied in Skaftin; MCP confirms table + constraints.
- [ ] `docs/03-database/` updated (new markdown or SQL snippet) describing the task table and relationships—**source of truth** for phase 2 field names.
- [ ] Resolve **open question** #1 (project delete vs tasks): document chosen `ON DELETE` behavior in that doc.

## Exit criteria

Phase 2 can start when another developer can implement CRUD using **only** the written contract + MCP snapshot, with no guesswork on column names.

## Out of scope

- React code, services, or routes.
