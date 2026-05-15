# `automation_rules` — schema contract

Stores **named rules** with a `trigger_key` and JSON `definition` for future automation (notifications, task seeding, etc.). The SPA can **CRUD** rules; durable execution may use Skaftin cron/webhooks later.

**DDL:** [sql/automation-rules.sql](./sql/automation-rules.sql)  
**MCP:** validated with `get_table_schema` on Cursor server `project-0-foro-skaftin`.

## Columns

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `id` | SERIAL | no | Primary key |
| `business_id` | INTEGER | no | Tenant scope |
| `project_id` | INTEGER | yes | FK → `projects.id` ON DELETE CASCADE; `NULL` reserved for business-wide rules (not used in MVP UI) |
| `name` | VARCHAR(200) | no | Human label |
| `trigger_key` | VARCHAR(64) | no | App-defined discriminator (e.g. `task_status_done`) |
| `definition` | JSONB | no | Default `{}`; conditions/actions payload |
| `enabled` | BOOLEAN | no | Default `true` |
| `created_at` | TIMESTAMP | no | |
| `updated_at` | TIMESTAMP | no | |

## Indexes

- `ix_automation_rules_business_id`
- `ix_automation_rules_project_id`
