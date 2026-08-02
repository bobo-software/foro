# Claude Rules

## Backend Request Implementation

foro-web talks to **foro-api** (first-party Node/Express/Drizzle service in the sibling `foro-api` repo) — not Skaftin. The Skaftin BaaS integration was migrated off in full; `skaftinClient`/`SKAFTIN_CONFIG` no longer exist.

Before implementing any backend request feature, always check:

1. The MCP tools (`mcp__foro-mysql__*`) for available server-side DB operations (schema introspection, migrations, bulk data loads) — these operate on foro-api's MySQL database directly.
2. The `client-sdk/requests/` docs for existing request patterns and API contracts.
3. `foro-api/docs/api.md` for the authoritative, up-to-date route/contract reference — it's kept in sync with what's actually shipped.

Do not invent or assume request shapes — consult these sources first. If a feature needs an endpoint that doesn't exist yet on foro-api, it needs to be built there first (resource-oriented REST under `/api/v1`, see `foro-api/src/lib/crudRouter.ts` for the standard CRUD pattern), not proxied through some other mechanism.

## Form Inputs

Always use the shared form components from `src/components/forms/` for all user inputs. Never use raw `<input>`, `<select>`, or `<textarea>` elements directly in pages or modals.

| Need | Component |
|------|-----------|
| Text, number, date, email input | `AppLabledInput` (`AppLabledInput.tsx`) |
| Single-select dropdown | `AppLabeledSelectInput` (`AppLabledSelectInput.tsx`) |
| Searchable autocomplete | `AppLabledAutocomplete` (`AppLabledAutocomplete.tsx`) |
| Multi-line text | `AppLabeledAreaInput` (`AppLabledAreaInput.tsx`) |

## Documentation Updates

Update the relevant docs in the `docs/` folder **as part of the same change** that adds or modifies a feature — not as a deferred follow-up. If a task touches multiple files over several steps, update the corresponding doc alongside the step that changes the behavior it describes, so the docs are never behind the code even mid-task.

- `docs/00-overview/` — if the feature affects overall architecture or project scope
- `docs/01-roles/` — if the feature affects user roles or permissions
- `docs/02-modules/` — if the feature adds or changes a module
- `docs/03-database/` — if the feature changes the database schema or data model

Keep docs in sync with the code — do not leave them stale, create a new subfolder if needed.
