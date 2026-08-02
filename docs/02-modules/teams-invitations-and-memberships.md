# Teams module

> **Migrated to foro-api.** `teamService.ts` now calls foro-api (`/api/v1/team-invites`, `/api/v1/team-memberships`) instead of Skaftin. One schema addition was needed to preserve the pre-signup invite-link preview flow: `team_invites` gained a `token_hash` column (mirroring `portal_invites`), since foro-api's mirrored schema hadn't included one. See [`client-sdk/requests/02-DOMAIN-RESOURCES.md`](../../client-sdk/requests/02-DOMAIN-RESOURCES.md) for the current request contracts, including the token-based preview/accept endpoints `InviteAccept.tsx`/`InvitePostAuth.tsx` use.

## Scope

Teams module adds:

- invite by email
- invite email template/link acceptance
- post-auth acceptance continuation
- multi-business membership switching
- settings tab for invite/member operations

## Frontend implementation map

- Routes:
  - `/invite/:token`
  - `/invite/:token/accept`
  - `/app/settings/team`
- New files:
  - `src/pages/team/InviteAccept.tsx`
  - `src/pages/team/InvitePostAuth.tsx`
  - `src/pages/admin/settings/tabs/TeamSettingsTab.tsx`
  - `src/stores/data/TeamStore.ts`
  - `src/services/teamService.ts`
  - `src/types/team.ts`

## Invite email template contract

Both HTML and plain text templates should include:

- `inviterName`
- `organizationName` (business name)
- `roleName`
- `acceptUrl`
- `expiryDate`
- `supportEmail`

Security text:

- domain disclosure
- expiry notice
- “ignore if not expected”

## Invite flow

1. Admin invites teammate from team settings.
2. Backend stores invite with token hash and expiry.
3. Email sends accept link.
4. User opens `/invite/:token`.
5. If unauthenticated, user signs in/registers and returns to `/invite/:token/accept`.
6. Backend accepts token, creates or reactivates membership, and returns active business id.
7. Frontend switches active business and redirects to dashboard.

## Multi-business behavior

- Business list now includes owned and linked memberships.
- Active business id persists in local storage.
- Navbar switcher is shown when user has more than one business.
- Invite acceptance can programmatically set active business.

## Failure states handled

- expired/revoked token
- invalid token
- email mismatch
- duplicate acceptance
- network retry scenarios

## Future additions

- richer member identity display (name/email from joined app users)
- role badges and filters
- ownership transfer workflow
- SCIM or bulk invite support
