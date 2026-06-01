# Foro documentation

| Doc | Purpose |
|-----|---------|
| [Implementation plan](plan.md) | Historical roadmap and architecture sketch |
| [Project database schema](project-database-schema.md) | Tables and migrations reference |
| [Credit notes](credit-notes/README.md) | Invoice credit notes: DB, types, UI, PDF |
| [UI: data tables](02-modules/ui-data-tables.md) | `AppDataTable` usage across the app |
| [Storage and logos](02-modules/storage.md) | MinIO bucket `foroman`, logo uploads, presigned URLs, troubleshooting |
| [Storage / logos DB contract](03-database/storage-and-logos-schema-contract.md) | `companies.logo_url` semantics and object paths |
| [Teams rollout](00-overview/teams-rollout-plan.md) | Delivery phases, MCP validation, readiness checks |
| [Teams roles](01-roles/teams-permissions-model.md) | Role matrix and authorization rules |
| [Teams module](02-modules/teams-invitations-and-memberships.md) | Invite/accept/member-management UX and architecture |
| [Project tasks (MVP)](02-modules/project-tasks.md) | Routes, `TaskService`, `project_tasks` — list + board (Kanban) on project detail |
| [PM / tasks progress](plans/project-task-management/PROGRESS.md) | Rolling status for project & task management phases |
| [Updating PM plans (Cursor rule)](../.cursor/rules/project-plan-updates.mdc) | Keep PROGRESS + phase docs in sync when shipping task/project work |
| [Teams DB + API contract](03-database/teams-schema-contract.md) | Schema, endpoints, constraints, and SQL migration |

Component-level notes for the shared table live next to the source: [`src/components/elements/AppDataTable.md`](../src/components/elements/AppDataTable.md).
