# Project time entries — database contract

**DDL:** [sql/project-time-entries.sql](./sql/project-time-entries.sql)  
**Progress:** [../plans/project-task-management/PROGRESS.md](../plans/project-task-management/PROGRESS.md)

## Columns

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | SERIAL | no | auto | Primary key |
| `business_id` | INTEGER | no | — | Tenant scope (no `businesses` FK in default Foro DDL) |
| `project_id` | INTEGER | no | — | FK → `projects.id` ON DELETE CASCADE |
| `task_id` | INTEGER | yes | — | FK → `project_tasks.id` ON DELETE SET NULL |
| `user_id` | INTEGER | no | — | App user who logged time (validate in app) |
| `logged_at` | TIMESTAMPTZ | no | now | When work occurred |
| `duration_minutes` | INTEGER | no | — | 1–1440 (one day max per row) |
| `billable` | BOOLEAN | no | true | Drives invoice rollups |
| `notes` | TEXT | yes | — | Optional memo |
| `created_at` | TIMESTAMP | no | now | |
| `updated_at` | TIMESTAMP | no | now | |

## Apply and verify

1. Run MCP `list_tables` / `get_table_schema` or apply SQL in your Skaftin project.
2. Smoke-test insert/select scoped by `{ business_id, project_id }`.
