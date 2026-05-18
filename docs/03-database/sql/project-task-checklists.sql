-- Named checklists and items per project task.
-- Requires: projects, project_tasks. Apply one statement per Skaftin MCP execute_sql call if required.

CREATE TABLE IF NOT EXISTS project_task_checklists (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_project_task_checklists_task_id ON project_task_checklists(task_id);

CREATE INDEX IF NOT EXISTS ix_project_task_checklists_business_project ON project_task_checklists(business_id, project_id);

CREATE TABLE IF NOT EXISTS project_task_checklist_items (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checklist_id INTEGER NOT NULL REFERENCES project_task_checklists(id) ON DELETE CASCADE,
  label VARCHAR(500) NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_project_task_checklist_items_checklist_id ON project_task_checklist_items(checklist_id);
