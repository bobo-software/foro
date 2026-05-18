# `project_task_checklists` / `project_task_checklist_items` — schema contract

Named **checklists** per task, each with ordered **checkable items**. Used in the task edit modal alongside description.

**DDL:** [sql/project-task-checklists.sql](./sql/project-task-checklists.sql)  
**Parent:** [project-tasks-schema-contract.md](./project-tasks-schema-contract.md)

## `project_task_checklists`

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `id` | SERIAL | no | Primary key |
| `business_id` | INTEGER | no | Tenant scope (not FK-linked to `businesses`) |
| `project_id` | INTEGER | no | FK → `projects.id` ON DELETE CASCADE |
| `task_id` | INTEGER | no | FK → `project_tasks.id` ON DELETE CASCADE |
| `title` | VARCHAR(200) | no | Checklist name |
| `position` | INTEGER | no | Order among checklists on the task (default 0) |
| `created_at` | TIMESTAMP | no | Default now |
| `updated_at` | TIMESTAMP | no | Default now; app sets on update |

## `project_task_checklist_items`

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `id` | SERIAL | no | Primary key |
| `business_id` | INTEGER | no | Tenant scope |
| `project_id` | INTEGER | no | FK → `projects.id` ON DELETE CASCADE |
| `checklist_id` | INTEGER | no | FK → `project_task_checklists.id` ON DELETE CASCADE |
| `label` | VARCHAR(500) | no | Item text |
| `is_done` | BOOLEAN | no | Default false |
| `position` | INTEGER | no | Order within checklist (default 0) |
| `created_at` | TIMESTAMP | no | Default now |
| `updated_at` | TIMESTAMP | no | Default now; app sets on update |

## Indexes

- `ix_project_task_checklists_task_id`
- `ix_project_task_checklists_business_project`
- `ix_project_task_checklist_items_checklist_id`

## App rules

- Callers must ensure `task_id` belongs to `project_id` and `business_id` matches the parent task before insert (DB does not cross-check task rows on checklist insert).
- Deleting a task cascades to its checklists and items.
