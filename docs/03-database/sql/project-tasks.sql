-- Project tasks (Kanban / list layer under projects)
-- Requires: projects (and a valid business_id value consistent with parent project / app tenant).
-- Note: Foro Skaftin schema validated via MCP has no `businesses` table; `business_id` is an
-- integer tenant key on projects, companies, invoices (same pattern as app code). No FK on business_id.
-- Apply in transactional migration runner where available.

BEGIN;

CREATE TABLE IF NOT EXISTS project_tasks (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'todo',
  priority VARCHAR(16),
  due_on DATE,
  assigned_to_user_id INTEGER,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_tasks_status_chk CHECK (
    status IN ('todo', 'in_progress', 'review', 'blocked', 'done')
  ),
  CONSTRAINT project_tasks_priority_chk CHECK (
    priority IS NULL OR priority IN ('low', 'normal', 'high', 'urgent')
  )
);

-- Optional: after validating the user table name in Skaftin, add:
--   ALTER TABLE project_tasks
--     ADD CONSTRAINT project_tasks_assigned_to_user_id_fkey
--     FOREIGN KEY (assigned_to_user_id) REFERENCES app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ix_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS ix_project_tasks_business_project ON project_tasks(business_id, project_id);
CREATE INDEX IF NOT EXISTS ix_project_tasks_assigned_to_user_id ON project_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS ix_project_tasks_due_on ON project_tasks(due_on);

COMMIT;
