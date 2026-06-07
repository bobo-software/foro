# Debt: Error Handling & Loading States

## Silent Error Swallowing

### Resolved

- `src/components/elements/PaymentForm.tsx` — silent catches replaced with `logger.error` + toast feedback
- `src/components/elements/InvoiceForm.tsx` — number generation catches now log with `logger.warn`
- `src/components/elements/QuotationForm.tsx` — same
- `src/pages/admin/companies/ProjectDetailPage.tsx` — API fetches (`loadTaskDeps`, `loadCategories`, `loadBillableRollup`) now log with `logger.warn`

### Acceptable Silent Catches

- `ProjectDetailPage.tsx` lines ~284, ~295, ~497, ~594, ~608 — `localStorage` read/write/remove operations. These silently fail in private/incognito mode; suppressing is intentional.

---

## Inconsistent Error UX

The app uses three different patterns for displaying errors, with no rule for which to use where:

1. Toast notifications (`react-hot-toast`) — used in most form submits
2. Inline error strings rendered below a field — used in `PaymentForm`, some modals
3. No error display at all — used in several async data loads

Fix: establish a convention:
- Field-level errors → inline text below the field
- Form-submit failures → toast
- Page-level data load failures → inline error banner inside the component (not a toast)

---

## Missing Loading States on Async Fetches

Several places call async services without providing user feedback during the request:

- Several modals open and immediately fetch data — if the fetch is slow the modal appears empty with no spinner
- Quick-add forms in `ProjectDetailPage.tsx` submit without disabling the button, allowing double-submits

Fix:
- Use `useState<boolean>` for loading on every user-triggered async operation
- Disable submit buttons while a request is in-flight
- Show a spinner or skeleton for data fetched on mount

---

## Inconsistent Loading State Naming

No consistent naming convention across stores and components:

- `loading` (most stores)
- `isLoading` (some components)
- `loadingPayment`, `loadingItems`, `loadingBillable` (local component state)

Fix: adopt `isLoading` as the standard name for boolean loading flags throughout.
