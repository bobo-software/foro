# Debt: Styling Inconsistencies

## Dark Mode — Shared Form Components

**Resolved.** All four shared form components now have `dark:` variants:
- `AppLabledInput.tsx` — `dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:focus:ring-indigo-400`
- `AppLabledSelectInput.tsx` — same
- `AppLabledAutocomplete.tsx` — same
- `AppLabledAreaInput.tsx` — same

## Dark Mode — Raw Input Migration

**Resolved.** All pages that had raw `<input>`/`<select>`/`<textarea>` elements have been migrated to shared components, which include dark mode by default. The last remaining file (`ProjectDetailPage.tsx`) was migrated in this session.

## Dark Mode — SkipLink

**Resolved.** `src/components/SkipLink.tsx` now has `dark:focus:bg-indigo-500 dark:focus:ring-indigo-300`.

---

## Accepted Exceptions

### Inline `style={{}}` Objects

Two legitimate inline style usages remain and are not actionable:

- `src/components/elements/AppNavbar.tsx` — SVG data URI as background image; cannot be expressed as a Tailwind class
- Dynamic width calculations using `style={{ width: \`${pct}%\` }}` — required for truly dynamic values; no Tailwind equivalent

No remaining `style={{ zIndex: ... }}` instances; those were replaced with Tailwind `z-[N]` classes.

### Mixed Tailwind Patterns

Most pages have been migrated away from `inputClass`/`labelClass` constants. A few compact-layout components (e.g. `QuotationHeaderFields.tsx`) accept class strings via props to preserve intentional compact styling — this is acceptable.
