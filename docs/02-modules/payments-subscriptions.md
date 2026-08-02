# Payments & Subscriptions

Every business starts on an active Free plan automatically, with usage capped by tier. Owners can upgrade any time from Settings → Billing, which integrates the Skaftin Payment API (Paystack) for the paid tiers.

> **Migration status:** `subscriptionService.ts` (CRUD on `business_subscriptions`) has been migrated to foro-api (`/api/v1/business-subscriptions`) — see [`client-sdk/requests/02-DOMAIN-RESOURCES.md`](../../client-sdk/requests/02-DOMAIN-RESOURCES.md). `paymentGatewayService.ts` (the actual Paystack/PayFast payment-initiation passthrough referenced above) has **not** been migrated — foro-api has no payment-provider integration yet, so it still calls Skaftin directly. This is a known, separately-tracked gap: whoever picks it up needs to decide whether foro-api integrates with Paystack/PayFast directly or keeps proxying through Skaftin for this one flow.

## Why

The Landing page has always marketed four tiers (Free / Bronze / Silver / Gold), but nothing enforced them — every account got unlimited access regardless of plan. This module makes the tiers real without putting a wall in front of the app: businesses are auto-enrolled on Free and simply capped once they hit its limits, with an upgrade path always available. See `docs/03-database/payments-schema-contract.md` for the data model.

## Flow

1. A user logs in and, once their active business is known (`useBusinessStore`), `SubscriptionGate` (`src/components/elements/SubscriptionGate.tsx`) ensures a `business_subscriptions` row exists for that business — creating one with `tier: 'free', status: 'active'` if it's missing. This never blocks rendering; it just guarantees tier data is available. Because a missing row is treated as "needs a Free row," this also transparently enrolls every pre-existing business the first time it's seen after this feature shipped — no migration job needed.
2. The **effective tier** used everywhere for limit checks is `status === 'active' ? tier : 'free'` (`getEffectiveTier()` in `SubscriptionStore.ts`). A pending checkout, a lapsed/failed payment, or a cancelled plan all simply fall back to Free limits — there is no blocked state.
3. Free-tier usage caps are enforced at the two points that have concrete numeric limits in the pricing copy:
   - **Companies** (`src/pages/admin/companies/CompanyFormPage.tsx`, `CompaniesPage.tsx`): client company count (`companies` where `is_owner_company = false`) is checked against `limits.companies` before create; the "+ Add company" action is replaced with an "Upgrade" prompt once at the cap.
   - **Team members** (`src/pages/admin/settings/tabs/TeamSettingsTab.tsx`): active memberships + outstanding invites are checked against `limits.teamMembers` before an invite is sent, so a business can't invite past its cap and land over the limit once invites are accepted.
   - Other marketed Free-tier restrictions (time tracking, custom branding, client portal, project automation, priority support, bulk operations, API access) are **not yet enforced** — intentionally scoped out for now; only the two numeric caps are live.
4. Choosing/keeping **Free** never requires payment. Choosing a **paid tier** (from Settings → Billing, `BillingSettingsTab`) calls `PaymentGatewayService.initiatePayment` (Paystack plan-based subscription), records a `status: 'pending'` row with the returned `transaction_id`, and redirects to the Paystack checkout URL.
5. On return, `/payment/success` (public route) polls `GET /app-api/payments/transaction/{id}` until it reports `complete`, flips the row to `active`, and redirects into `/app`. `/payment/cancel` sends the owner back to Settings → Billing with the business still on its prior effective tier (Free, if this was a first upgrade attempt).
6. `SubscriptionGate` also re-polls any `pending` row on every mount — since this is a frontend-only app with no server-side webhook handler, this is the fallback reconciliation path if a user abandons the browser mid-checkout.
7. Cancelling a paid plan (`SubscriptionStore.cancel()`) reverts the row to `tier: 'free', status: 'active'` immediately — there is no "cancelled and blocked" state, only a return to Free.

## Key files

- `src/types/subscription.ts` — types for the local table and the Skaftin Payment API.
- `src/config/pricingTiers.ts` — the single source of truth for tier pricing/features/limits/Paystack `plan_code`, shared by the Landing page, the billing tab, and the limit checks. `limits: { companies, teamMembers }` drives both the enforced caps and the corresponding feature-list bullets, so they can't drift apart.
- `src/services/subscriptionService.ts` / `src/services/paymentGatewayService.ts` — data access (kept separate: the former is CRUD on our own table, the latter wraps the gateway).
- `src/stores/data/SubscriptionStore.ts` — orchestration (ensure/auto-provision, start checkout, reconcile, cancel-to-free) and `getEffectiveTier()`.
- `src/hooks/useSubscriptionLimits.ts` — the effective tier + its caps, for any page that needs to gate an action.
- `src/hooks/useBusinessRole.ts` — `useIsBusinessOwner`, used to restrict Settings → Billing to the business owner (no other part of the app resolves per-business ownership; the legacy `AuthStore.hasRole` checks a global, business-agnostic role).
- `src/components/elements/SubscriptionGate.tsx` — the auto-provisioning point, wrapping `AppLayout` at the `/app` route.

## Manual prerequisites

Paystack must be configured as an active provider in the Skaftin dashboard for this project, and a plan (`plan_code`) created/synced for each paid tier — those codes are filled into `src/config/pricingTiers.ts`.
