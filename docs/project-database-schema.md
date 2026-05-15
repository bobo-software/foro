# Project database schema changes

This document defines the database updates needed to support:

- `company -> project -> invoices/quotations/payments`
- project-scoped statements
- backward compatibility for existing records with no project

## 1) Create `projects` table

```sql
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  starts_on DATE,
  ends_on DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 2) Add project foreign keys to document tables

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS project_id INTEGER NULL;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS project_id INTEGER NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS project_id INTEGER NULL;
```

## 3) Foreign key constraints

```sql
ALTER TABLE projects
  ADD CONSTRAINT IF NOT EXISTS projects_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE projects
  ADD CONSTRAINT IF NOT EXISTS projects_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT IF NOT EXISTS invoices_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE quotations
  ADD CONSTRAINT IF NOT EXISTS quotations_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD CONSTRAINT IF NOT EXISTS payments_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
```

## 4) Indexes for query performance

```sql
CREATE INDEX IF NOT EXISTS idx_projects_business_id ON projects (business_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects (company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_business ON projects (company_id, business_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_quotations_project_id ON quotations (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON payments (project_id);
```

## 5) Backward compatibility and rollout

- Existing rows remain valid because `project_id` is nullable.
- New writes should require `project_id` in application validation.
- Company-wide statement mode should include both:
  - project-linked documents
  - legacy records where `project_id IS NULL`

## 6) Optional hardening

To avoid duplicate project names inside the same company:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_company_name_unique
ON projects (company_id, name);
```

## 7) Credit notes (same `invoices` table)

Credit notes reuse `invoices` and `invoice_items` with a discriminator and optional link to the original invoice.

```sql
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS document_kind VARCHAR(20) NOT NULL DEFAULT 'invoice';

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS credited_invoice_id INTEGER NULL;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_credited_invoice_id_fkey
  FOREIGN KEY (credited_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
```

- `document_kind`: `'invoice'` (default) or `'credit_note'`.
- `credited_invoice_id`: set when the credit note applies to a specific invoice; nullable for ad-hoc credits.
- Amounts (`subtotal`, `tax_amount`, `total`) stay **positive**; the app applies a negative sign in balances and statements for `credit_note`.

## 8) Stock item types and bill of materials

`stock_items` distinguishes sellable **single** SKUs from **manufactured** assemblies. Manufactured items list component stock items and quantities per finished unit in `stock_item_bom_lines`.

```sql
ALTER TABLE stock_items
  ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'single';

-- CHECK: item_type IN ('single', 'manufactured')
```

```sql
CREATE TABLE IF NOT EXISTS stock_item_bom_lines (
  id SERIAL PRIMARY KEY,
  parent_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  component_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE RESTRICT,
  quantity_per NUMERIC NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  CONSTRAINT stock_item_bom_lines_quantity_positive CHECK (quantity_per > 0),
  CONSTRAINT stock_item_bom_lines_parent_component_unique UNIQUE (parent_item_id, component_item_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_item_bom_lines_parent ON stock_item_bom_lines (parent_item_id);
```

- **`item_type`**: `'single'` (default) or `'manufactured'`. Only manufactured items should have BOM rows; the app clears BOM when switching to single.
- **`stock_item_bom_lines`**: one row per component; `quantity_per` is the amount of that component required **per one** parent unit (supports decimals).

## 9) Project tasks

Operational tasks under a project (list/Kanban). See:

- Contract: [docs/03-database/project-tasks-schema-contract.md](03-database/project-tasks-schema-contract.md)
- DDL: [docs/03-database/sql/project-tasks.sql](03-database/sql/project-tasks.sql)

Deleting a **project** cascades to its `project_tasks` rows (`ON DELETE CASCADE` on `project_id`).

**Skaftin / Foro note:** The live project schema may not define a `businesses` table; `business_id` is still used as a tenant integer on `projects` and related tables. The `project_tasks` DDL in [sql/project-tasks.sql](03-database/sql/project-tasks.sql) follows that pattern (no FK on `business_id`). Validate with MCP `list_tables` / `get_table_schema` before assuming older `businesses`-FK documentation elsewhere in this file.

## 10) Project time entries and budgets (Phase 7)

- **Time entries:** [docs/03-database/project-time-entries-schema-contract.md](03-database/project-time-entries-schema-contract.md), DDL [docs/03-database/sql/project-time-entries.sql](03-database/sql/project-time-entries.sql). Rows tie **`project_id`** (and **`business_id`**) to optional **`task_id`**, **`user_id`**, **`duration_minutes`**, **`billable`**, etc.
- **Project budgets:** optional **`budget_hours`** / **`budget_amount`** on `projects` — [project-budget-columns-contract.md](03-database/project-budget-columns-contract.md), DDL [docs/03-database/sql/project-budget-columns.sql](03-database/sql/project-budget-columns.sql).

Apply both scripts on each environment before using the project detail **Budget and time** card or invoice **billable time** summary.

## 11) Phase 8 — task dependencies, automation rules, portal invites

- **Task dependencies (Gantt edge):** [project-task-dependencies-schema-contract.md](03-database/project-task-dependencies-schema-contract.md), DDL [sql/project-task-dependencies.sql](03-database/sql/project-task-dependencies.sql). Deletes cascade from `projects` / `project_tasks`.
- **Automation rules (stored triggers):** [automation-rules-schema-contract.md](03-database/automation-rules-schema-contract.md), DDL [sql/automation-rules.sql](03-database/sql/automation-rules.sql). Execution is app-defined later; the SPA stores rules per project.
- **Portal invites (hashed tokens):** [portal-invites-schema-contract.md](03-database/portal-invites-schema-contract.md), DDL [sql/portal-invites.sql](03-database/sql/portal-invites.sql). Public read view: route `/portal/v/:token` in the SPA.

Re-apply DDL on new environments and run MCP `get_table_schema` for each table name after migration.
