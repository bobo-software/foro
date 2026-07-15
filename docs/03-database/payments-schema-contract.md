# Payments/Subscriptions database contract

This document specifies the tiered-subscription data model backing per-business plan tracking and usage caps (see `docs/02-modules/payments-subscriptions.md`). There is no gate in front of `/app` — every business is always usable on at least Free.

## MCP-validated baseline

Validated through Skaftin MCP (`get_project_info`, `list_tables`, `get_table_schema`) against project `foro` (id `7`):

- No `subscriptions`/`payment_*` tables existed prior to this feature — greenfield.
- `companies` is the account/business table; the owner row (`is_owner_company = true`) is what `team_memberships.business_id` and `user_businesses.business_id` reference.
- `team_memberships.role_key` (default `'member'`) is how business ownership is determined — `role_key = 'owner'` is set when the owner creates their company during onboarding.

## Schema

### `business_subscriptions`

Purpose: one row per business tracking its chosen tier, payment status, and the Skaftin Payment API transaction that funded it. `SubscriptionGate` auto-creates a `tier: 'free', status: 'active'` row the first time a business is seen with none — this doubles as the mechanism that brings pre-existing businesses (created before this feature shipped) onto Free automatically, no separate backfill/migration job required.

Columns:

- `id serial primary key`
- `business_id int not null unique` (FK to `companies.id`, `ON DELETE CASCADE`) — one row per business
- `tier varchar(20) not null default 'free'` — `free`, `bronze`, `silver`, `gold`
- `status varchar(20) not null default 'pending'` — `active`, `pending`, `past_due`, `cancelled`
- `provider varchar(30) default 'paystack'`
- `plan_code varchar(100)` — Paystack plan code for paid tiers, null for free
- `transaction_id varchar(100)` — most recent Skaftin Payment API transaction UUID
- `subscription_token varchar(255)` — Paystack subscription token, set once available (used to cancel)
- `amount numeric(10,2)`
- `currency varchar(10) default 'ZAR'`
- `current_period_end timestamp`
- `created_at timestamp default current_timestamp`
- `updated_at timestamp default current_timestamp`

Constraints:

- `tier` and `status` are `CHECK`-constrained to their enumerated values (see `sql/payments-subscriptions.sql`)
- `business_id` is `UNIQUE` — enforces the 1:1 relationship with `companies`

## State machine

- No row → `SubscriptionGate` creates one as `tier: 'free', status: 'active'`.
- The **effective tier** used for usage-cap checks everywhere is `status === 'active' ? tier : 'free'` (`getEffectiveTier()`) — so `pending`/`past_due` transparently behave as Free until resolved. There is no blocked state.
- Paid tiers insert as `status = 'pending'` with the `transaction_id` returned by `POST /app-api/payments/initiate`, then flip to `active` once `GET /app-api/payments/transaction/{id}` reports `complete` (polled client-side from `/payment/success`, and re-polled by `SubscriptionGate` on every mount as a self-healing fallback — this repo has no server-side webhook handler, so client polling is the reconciliation mechanism).
- `past_due` results from a failed/cancelled transaction, surfaced in the Billing tab; the business still uses Free limits in the meantime. Cancelling a paid plan (`SubscriptionStore.cancel()`) sets `tier: 'free', status: 'active'` directly — `cancelled` is not a persisted status in practice.

## Client integration

- `src/types/subscription.ts` — `BusinessSubscription`, plus the Skaftin Payment API request/response shapes.
- `src/services/subscriptionService.ts` — CRUD over this table via `/app-api/database/tables/business_subscriptions/*`.
- `src/services/paymentGatewayService.ts` — wraps the Skaftin Payment API itself (list plans, initiate, transaction status, cancel).
- `src/stores/data/SubscriptionStore.ts` — orchestrates the two services for the active business.
