-- South African banks reference table
-- Seed data applied via Skaftin MCP bulk_insert_data (33 BASA banks).

BEGIN;

CREATE TABLE IF NOT EXISTS banks (
  id SERIAL PRIMARY KEY,
  external_id INTEGER NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  code VARCHAR(32) NOT NULL,
  longcode VARCHAR(32),
  gateway VARCHAR(255),
  pay_with_bank BOOLEAN NOT NULL DEFAULT false,
  supports_transfer BOOLEAN NOT NULL DEFAULT true,
  available_for_direct_debit BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  country VARCHAR(100) NOT NULL DEFAULT 'South Africa',
  currency VARCHAR(3) NOT NULL DEFAULT 'ZAR',
  type VARCHAR(32),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_banks_active ON banks(active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS ix_banks_name ON banks(name);

COMMIT;
