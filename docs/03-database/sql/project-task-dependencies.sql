-- Directed edges: predecessor must finish before successor (Gantt / planning).
-- Requires: projects, project_tasks. Apply one statement per Skaftin MCP execute_sql call if required.

BEGIN;

CREATE TABLE IF NOT EXISTS project_task_dependencies (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  predecessor_task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  successor_task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT project_task_dependencies_distinct_chk CHECK (predecessor_task_id <> successor_task_id),
  CONSTRAINT project_task_dependencies_edge_uniq UNIQUE (predecessor_task_id, successor_task_id)
);

CREATE INDEX IF NOT EXISTS ix_project_task_dependencies_project_id ON project_task_dependencies(project_id);
CREATE INDEX IF NOT EXISTS ix_project_task_dependencies_business_project ON project_task_dependencies(business_id, project_id);

COMMIT;
