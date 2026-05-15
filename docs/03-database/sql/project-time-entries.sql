-- Billable / operational time linked to projects (and optionally tasks).
-- Requires: projects, project_tasks. No FK on business_id (Foro tenant pattern).
-- Apply in transactional migration runner where available.
-- Skaftin MCP `execute_sql`: run one SQL statement per call (multi-statement scripts may fail).

BEGIN;

CREATE TABLE IF NOT EXISTS project_time_entries (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id INTEGER NULL REFERENCES project_tasks(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_minutes INTEGER NOT NULL,
  billable BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_time_entries_duration_chk CHECK (
    duration_minutes > 0 AND duration_minutes <= 1440
  )
);

CREATE INDEX IF NOT EXISTS ix_project_time_entries_project_id ON project_time_entries(project_id);
CREATE INDEX IF NOT EXISTS ix_project_time_entries_business_project ON project_time_entries(business_id, project_id);
CREATE INDEX IF NOT EXISTS ix_project_time_entries_task_id ON project_time_entries(task_id);
CREATE INDEX IF NOT EXISTS ix_project_time_entries_user_id ON project_time_entries(user_id);
CREATE INDEX IF NOT EXISTS ix_project_time_entries_logged_at ON project_time_entries(logged_at);

COMMIT;
