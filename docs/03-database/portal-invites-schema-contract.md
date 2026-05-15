# `portal_invites` — schema contract

Stores **hashed** portal tokens for read-only project sharing. Plaintext token is returned **once** at creation; only SHA-256 (hex) is persisted in `token_hash`.

**DDL:** [sql/portal-invites.sql](./sql/portal-invites.sql)  
**MCP:** validated with `get_table_schema` on Cursor server `project-0-foro-skaftin`.

## Security note

The SPA uses the same Skaftin credentials as the rest of the app. **Row scope** relies on long random tokens and `token_hash` lookups; production hardening may require Skaftin RLS or a dedicated backend. See [project-phase8-portal-gantt-automation.md](../02-modules/project-phase8-portal-gantt-automation.md).

## Columns

| Column | Type | Nullable | Notes |
|--------|------|----------|--------|
| `id` | SERIAL | no | Primary key |
| `business_id` | INTEGER | no | Tenant scope |
| `project_id` | INTEGER | no | FK → `projects.id` ON DELETE CASCADE |
| `token_hash` | VARCHAR(64) | no | SHA-256 hex of plaintext token; UNIQUE |
| `label` | VARCHAR(200) | yes | Optional note for internal users |
| `expires_at` | TIMESTAMP | no | Invite ignored after this instant |
| `revoked_at` | TIMESTAMP | yes | When set, invite is invalid |
| `created_at` | TIMESTAMP | no | |
| `updated_at` | TIMESTAMP | no | |

## Indexes

- `ix_portal_invites_project_id`
- `ix_portal_invites_token_hash`
