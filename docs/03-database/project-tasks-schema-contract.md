# Project tasks — database contract

Authoritative column list and behavior for the `project_tasks` table. Application types and [`TaskService`](../../src/services/taskService.ts) must match this document.

**Implementation progress:** [../plans/project-task-management/PROGRESS.md](../plans/project-task-management/PROGRESS.md) (rolling log).

**DDL source:** [sql/project-tasks.sql](./sql/project-tasks.sql)

**Related:** [project-database-schema.md](../project-database-schema.md) (`projects`, financial `project_id` links). **Title filter / `where` shape:** [project-tasks-select-filters.md](./project-tasks-select-filters.md). **Per-task checklists:** [project-task-checklists-schema-contract.md](./project-task-checklists-schema-contract.md).

## MCP-validated baseline (Foro production schema)

Validated with Skaftin MCP tools `list_tables` and `get_table_schema` (Cursor server id: `project-0-foro-skaftin`; configured in [`.cursor/mcp.json`](../../.cursor/mcp.json) as `skaftin`):

| Finding | Detail |
|---------|--------|
| `project_tasks` | **Not present** until this migration is applied; safe to create as specified. |
| `businesses` | **No table** named `businesses` in the project schema. Tenant key is `business_id` (integer) on `projects`, `companies`, `invoices`, `user_businesses`, etc. **Do not** add `REFERENCES businesses(id)` in this environment. |
| `projects` | Exists. Columns include `id`, `business_id` (**nullable** in DB), `company_id`, `name`, `starts_on`, `ends_on`, `created_at`, `updated_at`, … App should still write `business_id` on tasks to match the parent project for selects. |
| User ids | No `app_users` table in `list_tables`. Assignment field `assigned_to_user_id` is a plain integer; validate assignees in app against `user_businesses` (`user_id`, `business_id`) or your platform user source before adding any FK. |

Re-run `list_tables` / `get_table_schema` after migration to confirm `project_tasks` and constraints.

## Apply and verify (operator checklist)

1. Run `list_tables` (MCP) and confirm whether your target project already has `project_tasks` (idempotent `CREATE TABLE IF NOT EXISTS` is fine).
2. If your deployment **does** have a `businesses` table, add an FK in a follow-up migration; the stock SQL intentionally omits it for the validated Foro schema.
3. Run [sql/project-tasks.sql](./sql/project-tasks.sql) against the Skaftin database (transactional runner or psql).
4. Call `get_table_schema` with `tableName: "project_tasks"` and align app types if the platform added columns.
5. Smoke-test: `insert_data` / SQL insert one row with valid `project_id` and `business_id` matching the parent `projects` row; select by `project_id`.

## Entity relationships

- `project_tasks.business_id`: **no DB FK** in default DDL; must equal the owning business the app uses for the parent project (enforce on write in `TaskService` / forms).
- `project_tasks.project_id` → `projects.id` (**ON DELETE CASCADE**). Deleting a project removes all its tasks.

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|--------|
| `id` | SERIAL | no | auto | Primary key |
| `business_id` | INTEGER | no | — | Tenant scope; must match parent project’s business in app logic |
| `project_id` | INTEGER | no | — | Parent project |
| `title` | VARCHAR(500) | no | — | Display title |
| `description` | TEXT | yes | — | Longer body |
| `status` | VARCHAR(32) | no | `todo` | See enums below |
| `priority` | VARCHAR(16) | yes | — | See enums below |
| `due_on` | DATE | yes | — | Date-only deadline (`YYYY-MM-DD`) |
| `assigned_to_user_id` | INTEGER | yes | — | Platform user id when assigned; optional FK documented in SQL comments |
| `position` | INTEGER | no | `0` | Kanban ordering within status column |
| `created_at` | TIMESTAMP | no | now | |
| `updated_at` | TIMESTAMP | no | now | App may set on update until DB trigger exists |

## Enums

### `status`

Allowed values (CHECK constraint in SQL):

- `todo`
- `in_progress`
- `review`
- `blocked`
- `done`

### `priority`

Nullable. When set, allowed values:

- `low`
- `normal`
- `high`
- `urgent`

## Indexes

- `ix_project_tasks_project_id` — list tasks for one project
- `ix_project_tasks_business_project` — tenant-scoped project queries
- `ix_project_tasks_assigned_to_user_id` — “my tasks” / assignment filters
- `ix_project_tasks_due_on` — due date sorting and reminders (future)
