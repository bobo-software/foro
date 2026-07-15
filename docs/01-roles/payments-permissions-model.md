# Payments/Subscriptions roles and permissions

This document defines who can act on a business's subscription. There is no longer a "blocked while unpaid" state to define permissions around — every business is always usable on at least the Free tier (see `docs/02-modules/payments-subscriptions.md`).

## Roles

Reuses the existing `team_memberships.role_key` values (see `docs/01-roles/teams-permissions-model.md`):

- `owner`: the only role that can view billing, change plan, or cancel a paid subscription (reverting to Free).
- `admin` / `member` / `viewer`: no billing capability — Settings → Billing shows them a "only the account owner can manage billing" message. They can otherwise use `/app` normally at all times, subject to the same tier-based usage caps as everyone else on the business (see below).

## Permission matrix

| Capability | owner | admin | member | viewer |
|---|---|---|---|---|
| View current plan (Settings → Billing) | yes | no | no | no |
| Change plan / start paid checkout | yes | no | no | no |
| Cancel subscription (revert to Free) | yes | no | no | no |
| Use `/app` | yes | yes | yes | yes |
| Subject to the business's tier usage caps (companies, team members) | yes | yes | yes | yes |

## Guardrails

- Ownership is resolved per-business via `team_memberships.role_key === 'owner'` (`useIsBusinessOwner`), not via the legacy global role system (`AuthStore.hasRole`/`isAdmin`), which is unrelated.
- Usage caps apply to the **business**, not the individual — any member creating a company or sending an invite is checked against the business's shared limit, regardless of their own role.
- A business with no `business_subscriptions` row at all (pre-existing businesses created before this feature shipped) is auto-provisioned onto Free the first time `SubscriptionGate` sees it — this is what brings existing account owners' businesses under tier limits without a separate migration job.
