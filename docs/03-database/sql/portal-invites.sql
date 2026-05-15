-- Magic-link style portal access: only token_hash is stored; plaintext token is shown once at creation.
-- Requires: projects. Apply one statement per Skaftin MCP execute_sql call if required.

BEGIN;

CREATE TABLE IF NOT EXISTS portal_invites (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  label VARCHAR(200),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT portal_invites_token_hash_uniq UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS ix_portal_invites_project_id ON portal_invites(project_id);
CREATE INDEX IF NOT EXISTS ix_portal_invites_token_hash ON portal_invites(token_hash);

COMMIT;
