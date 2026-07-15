# Claude Rules

## Backend Request Implementation

Before implementing any backend request feature, always check:

1. The MCP tools (e.g., `mcp__skaftin__*`) for available server-side operations.
2. The `client-sdk/requests/` docs for existing request patterns and API contracts.

Do not invent or assume request shapes — consult these sources first.

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
