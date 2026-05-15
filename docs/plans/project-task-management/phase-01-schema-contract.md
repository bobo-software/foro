# Phase 1: Schema & contract

**Status:** Done (2026-05-14). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** None (first implementation slice).

**Blocks:** [phase-02-access-layer.md](./phase-02-access-layer.md).

## Objective

Introduce the task persistence layer in Skaftin and lock the **authoritative** column list, types, indexes, and FK behavior in repo docs—without building the app UI yet.

## Workflow (required)

1. Use **Skaftin MCP** (Cursor: server `project-0-foro-skaftin` if descriptors are under that id; URL auth in `.cursor/mcp.json`):
   - `list_tables` — confirm `project_tasks` absent/present; confirm there is **no** `businesses` table in this project (Foro uses loose `business_id` like `projects` / `invoices`).
   - `get_table_schema` for `projects`, `companies`, `invoices` as needed — match column names and nullability.
2. Read existing [`ProjectService`](../../../src/services/projectService.ts) request patterns (`/app-api/database/tables/...`) so new table operations match established shapes. (There is no `client-sdk` folder in this repo.)
3. Design migration from [project-tasks-schema-contract.md](../../03-database/project-tasks-schema-contract.md); apply (`execute_sql`, migration UI, or `project-tasks.sql`); re-verify with `get_table_schema` + `list_tables`.

## MCP refinement (done for Foro schema)

See **“MCP-validated baseline”** in [project-tasks-schema-contract.md](../../03-database/project-tasks-schema-contract.md). Summary: **no `businesses` FK** on `project_tasks.business_id`; **only** `project_id` → `projects` is a hard FK in the shipped SQL.

## Proposed direction (verify, do not assume)

- Table name: **`project_tasks`** (confirmed unused in `list_tables` before apply).
- Columns: `id`, `business_id` (NOT NULL, no FK in default DDL), `project_id`, `title`, `description`, `status`, `priority`, `due_on`, `assigned_to_user_id`, `position`, timestamps — see contract doc.
- FK: `project_id` → `projects.id` **ON DELETE CASCADE**. Tenant alignment for `business_id` is **application-enforced** to match the parent project.
- Indexes: `(project_id)`, `(business_id, project_id)`, `(assigned_to_user_id)`, `(due_on)`.

## Deliverables

- [x] Migration applied in Skaftin; MCP confirms table + constraints (repeat per environment).
- [x] `docs/03-database/` updated (new markdown or SQL snippet) describing the task table and relationships—**source of truth** for phase 2 field names.
- [x] Resolve **open question** #1 (project delete vs tasks): document chosen `ON DELETE` behavior in that doc.

## Exit criteria

Phase 2 can start when another developer can implement CRUD using **only** the written contract + MCP snapshot, with no guesswork on column names.

## Out of scope

- React code, services, or routes.
