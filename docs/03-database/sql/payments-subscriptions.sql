-- Payments/Subscriptions feature — business_subscriptions table
-- Applied to project `foro` (id 7) via mcp__skaftin__apply_migration.

CREATE TABLE business_subscriptions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free','bronze','silver','gold')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active','pending','past_due','cancelled')),
  provider VARCHAR(30) DEFAULT 'paystack',
  plan_code VARCHAR(100),
  transaction_id VARCHAR(100),
  subscription_token VARCHAR(255),
  amount NUMERIC(10,2),
  currency VARCHAR(10) DEFAULT 'ZAR',
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
