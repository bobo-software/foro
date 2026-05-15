# Skaftin / backend wishlist (deferred)

**Purpose:** Track **server-side and BaaS** capabilities we want later, while the Foro SPA continues on **frontend-only** work. Nothing here is committed to a date; pick items when you open a backend track.

**Related:** [PROGRESS.md](./PROGRESS.md), [project-phase8-portal-gantt-automation.md](../../02-modules/project-phase8-portal-gantt-automation.md), [teams-permissions-model.md](../../01-roles/teams-permissions-model.md), [skaftin-docs-and-schema-verification.mdc](../../../.cursor/rules/skaftin-docs-and-schema-verification.mdc).

---

## Security & tenancy

| Item | Why |
|------|-----|
| **Row-level security (RLS) or equivalent** | Scope reads/writes by `business_id` / membership so a leaked API key cannot read arbitrary tenants. |
| **Scoped API keys for portal** | Separate key or JWT for `/portal/v/*` with access only to `portal_invites` resolution + read models for that invite’s `project_id` / `business_id`. |
| **Portal session / token exchange** | Today the SPA uses the same Skaftin credentials as staff; replace with short-lived portal tokens or opaque session ids bound server-side to invite rows. |
| **Audit log** | Who created/revoked portal invites, who ran destructive automation, invoice deletes, etc. |

---

## Portal & customer access

| Item | Why |
|------|-----|
| **Email (or SMS) delivery of invite links** | Operators should not rely on manual copy/paste only. |
| **Invite open / view analytics** | Count views, last seen, optional geo (privacy-sensitive). |
| **Approvals & comments** | Customer “approve milestone” or threaded comments without full Foro accounts. |
| **File exchange** | Attachments on portal-visible milestones or tasks (virus scan, size limits, retention). |
| **Custom domain / subdomain** | `projects.customer.com` CNAME to portal host. |

---

## Data & performance

| Item | Why |
|------|-----|
| **Server-side aggregates** | `SUM(duration_minutes)` / counts / budget burn in **one** query instead of paging `select` (removes client caps like `MAX_BILLABLE_ROLLUP_*`). |
| **Materialized or cached rollups** | Precomputed project totals for dashboards and invoices at scale. |
| **Indexes tuned for PM queries** | Composite indexes for `(business_id, project_id, billable, logged_at)` etc. — validate with real query plans. |
| **Soft delete & retention** | Projects/tasks/time with `deleted_at` and purge jobs for GDPR. |

---

## Automation

| Item | Why |
|------|-----|
| **Skaftin cron / workers** | Run rules on schedule or queue (not only in-browser on save). |
| **Webhook / email actions** | `definition.action` beyond `toast`: POST to URL, sendgrid, etc. |
| **Strict JSON Schema per `trigger_key`** | Validate `definition` server-side; reject bad payloads at insert/update. |
| **Idempotency & dedupe keys** | Avoid double-firing when clients retry. |

---

## Gantt / planning (if stored server-side)

| Item | Why |
|------|-----|
| **Duration / start fields** | If timeline moves beyond `due_on`-only, persist planned start/end or duration. |
| **Critical path or dependency constraints** | Optional server validation (no cycles, max lag). |

---

## Integrations

| Item | Why |
|------|-----|
| **Calendar feeds (iCal)** | Per-project or per-user `webcal://` URLs. |
| **Slack / Teams notifications** | Outbound webhooks for task done / overdue digest. |

---

## How to use this list

1. When starting backend work, **copy one row** into a proper phase spec or ticket with acceptance criteria and MCP schema checks.  
2. After shipping, **remove or strike** the row here and update [PROGRESS.md](./PROGRESS.md) + relevant `docs/03-database/` contracts.  
3. Keep **Skaftin MCP** (`list_tables`, `get_table_schema`, `execute_sql` where allowed) in the loop for any DDL or contract change.
