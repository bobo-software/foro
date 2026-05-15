# `project_task_dependencies` — schema contract

Directed **predecessor → successor** edges for tasks in one project. Used for timeline / Gantt hints in the SPA.

**DDL:** [sql/project-task-dependencies.sql](./sql/project-task-dependencies.sql)  
**MCP:** validated with `list_tables` / `get_table_schema` on Cursor server `project-0-foro-skaftin`.

## Columns

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `id` | SERIAL | no | Primary key |
| `business_id` | INTEGER | no | Tenant scope (same pattern as `project_tasks`; not FK-linked to `businesses`) |
| `project_id` | INTEGER | no | FK → `projects.id` ON DELETE CASCADE |
| `predecessor_task_id` | INTEGER | no | FK → `project_tasks.id` ON DELETE CASCADE |
| `successor_task_id` | INTEGER | no | FK → `project_tasks.id` ON DELETE CASCADE |
| `created_at` | TIMESTAMP | no | Default now |

## Constraints

- `predecessor_task_id <> successor_task_id`
- UNIQUE `(predecessor_task_id, successor_task_id)` — one edge per ordered pair

## Indexes

- `ix_project_task_dependencies_project_id`
- `ix_project_task_dependencies_business_project`

## App rules

- Callers should ensure both tasks belong to `project_id` and `business_id` before insert (DB does not cross-check task rows).
