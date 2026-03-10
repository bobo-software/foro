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

