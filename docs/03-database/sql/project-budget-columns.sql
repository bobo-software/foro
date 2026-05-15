-- Optional project budgets (Phase 7). Numeric caps for hours and/or currency amount.
-- Requires: projects. Safe to run multiple times (IF NOT EXISTS).
-- Skaftin MCP `execute_sql`: prefer one `ALTER TABLE ... ADD COLUMN` per call if multi-command scripts fail.

BEGIN;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS budget_hours NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(14, 2);

COMMIT;
