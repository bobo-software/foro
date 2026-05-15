-- Stored automation definitions (triggers + JSON payload). Execution engine is not in the SPA yet.
-- Requires: projects (optional FK on project_id). Apply one statement per Skaftin MCP execute_sql call if required.

BEGIN;

CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  trigger_key VARCHAR(64) NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_automation_rules_business_id ON automation_rules(business_id);
CREATE INDEX IF NOT EXISTS ix_automation_rules_project_id ON automation_rules(project_id);

COMMIT;
