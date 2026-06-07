# Debt: Raw Form Inputs (CLAUDE.md Violations)

CLAUDE.md requires all user inputs to use shared components from `src/components/forms/`. Raw `<input>`, `<select>`, and `<textarea>` elements bypass shared styling, dark mode support, and accessibility handling.

**Status: Resolved.** All pages and modals now use shared form components.

---

## Required Components

| Need | Shared Component |
|---|---|
| Text / number / date / email | `AppLabledInput` |
| Single-select dropdown | `AppLabeledSelectInput` |
| Searchable autocomplete | `AppLabledAutocomplete` |
| Multi-line text | `AppLabeledAreaInput` |

---

## Resolved Files

- `src/pages/admin/companies/CompanyFormPage.tsx` — migrated; sub-components extracted
- `src/pages/admin/Onboard.tsx` — migrated; reuses `CompanyAddressFields`
- `src/components/elements/PaymentForm.tsx` — migrated
- `src/pages/admin/projects/ProjectsOverviewPage.tsx` — migrated
- `src/pages/admin/ItemFormPage.tsx` — migrated
- `src/pages/admin/companies/ProjectTaskDependenciesCard.tsx` — migrated
- `src/pages/admin/companies/ProjectAutomationRulesCard.tsx` — migrated
- `src/pages/admin/companies/ProjectPortalInvitesCard.tsx` — migrated
- `src/components/modals/ManageCategoriesModal.tsx` — category name migrated (color swatch select kept as legitimate custom pattern)
- `src/components/elements/InvoiceForm.tsx` — migrated; header fields and billable-time panel extracted
- `src/pages/admin/companies/companyPage/tabs/CompanyEditTab.tsx` — migrated
- `src/pages/admin/companies/ProjectDetailPage.tsx` — migrated; `id` and `labelHidden` props added to shared components to support table-row inline edits

---

## Acceptable Exceptions

- `<input type="checkbox">` — no shared component in the table above; raw checkboxes are acceptable for inline toggle patterns (timer billable, log billable)
- Color swatch `<select>` in `ManageCategoriesModal` — custom visual pattern not covered by `AppLabeledSelectInput`

---

## Why It Matters

- Bypasses dark mode — raw inputs stay light in dark theme
- No unified focus ring or error state styling
- ARIA attributes (`aria-invalid`, `aria-describedby`) missing on raw elements
- Every raw input requires bespoke CSS maintenance
