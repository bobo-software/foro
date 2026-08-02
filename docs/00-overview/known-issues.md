# Known issues / follow-ups

Running log of issues found while testing the Skaftin → foro-api migration end-to-end
with Chrome DevTools (register → login → create records across every module). Fixed
items are noted with what changed; open items are follow-ups for later.

## Fixed during this pass

### 1. Cross-tenant data exposure in `crudRouter` (critical)
GET list / GET `/:id` on nearly every resource (companies, invoices, quotations,
payments, projects, contacts, banking details, etc.) only required a valid JWT —
there was no server-side scoping to the caller's own data. Any authenticated user,
including a brand-new signup, could list or fetch by ID any tenant's records.

**Fix:** `foro-api/src/lib/tenantScope.ts` (new) + `tenantScope`/`parentTenantScope`
options on `createCrudRouter` (`foro-api/src/lib/crudRouter.ts`), enforced on GET
list, GET `/:id`, PUT, and DELETE. Wired into all 8 route files (`CompanyRoutes`,
`SalesRoutes`, `ProjectRoutes`, `CatalogRoutes`, `AutomationRoutes`, `PortalRoutes`,
`TeamRoutes`, `BankRoutes`).

### 2. `business_id`/`businessId` casing mismatch (frontend)
`CompanyService.findAll` only recognized camelCase `businessId` for server-side
filtering; three call sites passed snake_case `business_id`, which silently fell
through to unfiltered (then client-side-only) results.

**Fix:** `src/stores/data/CompanyStore.ts`, `src/stores/data/DashboardStore.ts`,
`src/pages/admin/projects/ProjectsOverviewPage.tsx` — now pass `businessId`.

### 3. `/auth/*` blanket exclusion from token-refresh-and-retry (frontend)
`ForoApiClient.handle401` skipped the refresh-and-retry flow for **any** endpoint
starting with `/api/v1/auth/`, including `/auth/me` and `/auth/logout`. In practice
this meant the periodic session check (`useSessionCheck` → `verifySession` →
`GET /auth/me`) force-logged users out on a 401 even when they held a perfectly
valid refresh token, instead of silently refreshing like every other route.

**Fix:** `src/backend/client/ForoApiClient.ts` — only `login`, `register`, and
`refresh` itself are excluded now; `me` and `logout` go through the normal flow.

### 4. Boolean/number query params silently no-op'd in `crudRouter` list filters (critical-adjacent)
`parseListParams` passed raw query-string values straight into Drizzle's `eq()`
without coercing them to the column's actual type. For boolean columns this is
fatal: `?isOwnerCompany=true` sends the literal string `"true"`, MySQL coerces that
to `0` when comparing against a tinyint column, and the filter matches nothing —
silently, with a `200 OK` and an empty array, not an error.

This meant **every** call to `CompanyService.getOwnerCompaniesForUser` /
`findOwnerCompanyByUserId` (which filters `isOwnerCompany=true`) has always
returned empty, regardless of the tenant-scoping fix above. Concretely: the app
could never recognize that a logged-in user had already set up their own
business — `SubscriptionGate`, `AppLayout`'s business fetch, `Onboard`, and
`SettingsPage` all rely on this call. Confirmed by reproducing directly: a company
row with `isOwnerCompany: true` in the DB came back as `data: []` from
`GET /companies?isOwnerCompany=true`.

**Fix:** `foro-api/src/lib/crudRouter.ts` — `coerceQueryValue()` coerces by
`column.dataType` (`boolean` → real boolean, `number` → `Number(...)`) before
building the `eq()` clause.

### 5. Optional fields sent as explicit `null` rejected by Zod schemas (critical-adjacent)
Confirmed independently in two modules while creating real records: `POST /invoices`
failed with `Invalid input: expected number, received null` (`creditedInvoiceId`),
and `POST /project-tasks` failed with `Invalid input: expected string, received null`
(`description`/`priority`/`dueOn`/`assignedToUserId`). The frontend consistently
sends explicit `null` for unset optional fields (e.g. `credited_invoice_id:
formData.document_kind === 'credit_note' ? … : null`), but Zod's `.optional()`
only accepts `undefined`, not `null` — this blocked invoice creation and task
creation entirely, and was very likely blocking other create/update forms too
(quotations, addresses, banking details, time entries, etc. all follow the same
pattern).

**Fix:** rather than chasing this field-by-field, added `foro-api/src/utils/
stripNulls.ts` — strips `null`-valued keys from the request body before
`schema.parse()`. Every optional column in this API is a nullable DB column with
no default, so `null` and "omitted" are equivalent for creates; for updates it
means a `null` field is now left untouched rather than erroring (see follow-up
below — this doesn't yet support explicitly clearing a field to `NULL` via
update). Wired into `crudRouter.ts`'s POST/PUT handlers and the two custom
`.parse(req.body)` call sites (`CompanyRoutes.ts` company creation,
`TeamRoutes.ts` team-invite creation). Also added `.nullable()` directly to
`creditedInvoiceId`/`convertedInvoiceId` in `salesSchemas.ts` for belt-and-braces
clarity (redundant with `stripNulls` now, but documents intent).

### 6. `banking_details`/`addresses` tenant scope too narrow (regression from fix #1)
Found while creating banking details end-to-end: the row saved fine (`201`), but
vanished from every subsequent GET — the settings page showed an empty form again
after reload. Both tables have **both** a `userId` and a `companyId` column, and a
row can be legitimately owned via either path (e.g. a business's own default
banking details are saved with `userId` set and `companyId: null` — there's no
"company" row representing your own business in that flow). The original
`tenantScope: { column: 'companyId', … }` only recognized the company path, so
`companyId IS NULL` rows became invisible to their own owner.

**Fix:** extended `tenantScope` on `createCrudRouter` to accept an array of
scopes, OR'd together (`foro-api/src/lib/crudRouter.ts`: `TenantScope |
TenantScope[]`, `or(...)` in the list WHERE clause, `.some(...)` in the
row-membership check). `addresses` and `banking-details` in `CompanyRoutes.ts`
now scope on `companyId IN accessible` **OR** `userId = self`.

### 7. POST/PUT-time cross-tenant writes across every scoped resource
Read/update/delete were scoped by fixes #1 and #6, but **create** wasn't checked
against the caller's accessible ids at all, and **update** didn't check a *new*
value if the client tried to re-point a row's tenant column. Concretely: any
authenticated user could `POST /contacts` with `companyId` set to a company they
don't own (planting data into another tenant's records), or `PUT` an owned row's
`companyId`/`businessId` to re-parent it into someone else's tenant. Verified
both live before and after the fix — `POST /contacts {companyId: 54}` (another
tenant's company) went from `201` to `403`, and `PUT /contacts/3 {companyId: 54}`
(re-parenting a contact we legitimately own) went from silently succeeding to
`403`.

**Fix:** `foro-api/src/lib/crudRouter.ts` — new `isInputInScope()`, applied in
the POST handler (payload must set at least one scope column to an accessible
id) and the PUT handler (if the payload touches a scope column, the new value
must also resolve to an accessible id; untouched scope columns are fine since
the existing row was already scope-checked). Applies uniformly wherever
`tenantScope`/`parentTenantScope` is configured — no route-file changes needed.

### 8. `POST /companies` trusted client-supplied `userId`
The custom handler in `CompanyRoutes.ts` inserted whatever `userId` the client
sent, defaulting to nothing if omitted — a malicious request could set `userId`
to another user's id, planting a company that would then appear on that user's
dashboard (since `companies.userId = req.user.id` is one of the three access
paths in `listAccessibleCompanyIds`). The auto-provisioned `team_memberships`
row was already hardcoded to the real caller, so this couldn't grant access to
someone else's data — it was a data-integrity/spoofing issue, not a read bypass.

**Fix:** `foro-api/src/routes/CompanyRoutes.ts` — `userId` is now always
overwritten server-side to `req.user.id` after schema parsing, regardless of
what the client sends. Verified: a request with `userId: 999` in the body
creates a row with the real caller's id.

### 9. Duplicate "Session Restored" toast
`Landing.tsx`'s redirect-if-authenticated effect had no guard against React 18
`StrictMode` double-invoking effects in dev, so the toast (and the `navigate`
call) fired twice on every load.

**Fix:** `src/pages/Landing.tsx` — added a `hasRedirected` ref guard so the
effect body only runs once regardless of how many times React invokes it.

## Verified as not a bug

- **Direct URL navigation to `/app/documents/quotations/create` redirects to
  the dashboard.** That URL was never a real link anywhere in the app — I typed
  it directly while testing. The actual "New Quotation"/"New Invoice" flows
  link to the dedicated top-level `/app/quotations/create` and
  `/app/invoices/create` routes (confirmed working). The redirect itself is
  just the app's catch-all (`*` → `/`) chaining through `Landing.tsx`'s
  already-authenticated redirect back into `/app` → `/app/dashboard` — expected
  behavior for any unmapped `/app/*` path, not specific to this URL.

## Open follow-ups (not fixed in this pass)

- **Updates can't explicitly clear an optional field to `NULL`.** A side effect
  of the `stripNulls` fix (#5 above): PUT requests now silently ignore
  `null`-valued keys rather than erroring, but that means there's currently no
  way to, say, unassign a task's `assignedToUserId` or clear a project's
  `endsOn` via the generic CRUD PUT — the old value just stays. Not currently
  exercised by any UI flow, but worth a real "clear to null" mechanism
  (e.g. a sentinel value, or a dedicated PATCH semantic) if that need comes up.
