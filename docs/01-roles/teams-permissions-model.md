# Teams roles and permissions

This document defines role behavior for team invites and membership administration.

## Roles

- `owner`: full control; can transfer ownership, manage billing, and remove any non-owner member.
- `admin`: can invite/manage members and operational modules, cannot remove last owner.
- `member`: standard day-to-day access for invoices, quotations, and customers.
- `viewer`: read-only access to selected modules.

## Permission matrix

| Capability | owner | admin | member | viewer |
|---|---|---|---|---|
| Create invite | yes | yes | no | no |
| Revoke invite | yes | yes | no | no |
| Resend invite | yes | yes | no | no |
| Change member role | yes | yes (up to member/viewer) | no | no |
| Remove member | yes | yes (not owner) | no | no |
| Remove owner | yes (with replacement) | no | no | no |
| Access settings/team tab | yes | yes | no | no |

## Guardrails

- Users can only assign roles at or below their own authority.
- `admin` cannot promote someone to `owner`.
- API must enforce authorization regardless of hidden UI controls.
- Last owner in an organization/business cannot be removed without ownership transfer.

## Invite acceptance policy

- Invite is bound to normalized email; acceptance requires exact email match.
- If signed in as different email, acceptance UI must show mismatch guidance.
- Existing active membership acceptance is idempotent and returns `success=true` without duplication.

## Audit requirements

Every role or membership mutation writes `membership_events` with:

- actor id
- target id
- previous role/status
- new role/status
- timestamp

This enables incident investigation and rollback support.

## Client portal access (planned)

Phase 8 may introduce **external** users who are not normal `owner` / `admin` / `member` / `viewer` business members. Until that product is specified, treat the following as **design constraints**:

- Portal users must **not** receive the same bearer tokens as internal users unless tokens are strictly scoped (e.g. read-only project + document subset).
- Any `viewer`-like portal role should be **deny-by-default** on mutations; promotions to internal roles stay on the invite / membership flows above.
- Authorization for portal routes must be enforced **server-side** (Skaftin or edge rules), not only in the SPA.
- The app currently exposes a **public** landing page at **`/portal`** with product copy only (no sessions, no scoped data); treat it as a URL placeholder until real portal auth exists.

See [project-phase8-portal-gantt-automation.md](../02-modules/project-phase8-portal-gantt-automation.md).
