# Technical Debt Register

A living record of known technical debt in the foro frontend. Items are grouped by category and prioritised. Each item should be linked to a fix or removed once resolved.

## Summary

| Category | Status | Remaining |
|---|---|---|
| Raw form inputs (CLAUDE.md violations) | Resolved | — |
| `any` types & unsafe casts | Resolved | `normalizeInvoice`/`normalizeQuotation` casts documented as acceptable in 02-type-safety.md |
| Monolithic components | Resolved | — |
| Duplicate / copy-paste logic | Resolved | — |
| Silent error handling | Resolved | localStorage catches are intentionally silent |
| Console logs in production paths | Resolved | — |
| Missing prop-type annotations | Resolved | — |
| Dark mode gaps | Resolved | SVG background inline style in `AppNavbar` (cannot be Tailwind) |

---

## Files

- [01-form-inputs.md](./01-form-inputs.md) — Raw HTML inputs violating CLAUDE.md
- [02-type-safety.md](./02-type-safety.md) — `any` types, unsafe casts, missing interfaces
- [03-large-components.md](./03-large-components.md) — Components > 800 lines
- [04-duplicate-code.md](./04-duplicate-code.md) — Copy-paste logic clusters
- [05-error-handling.md](./05-error-handling.md) — Silent failures and missing loading states
- [06-console-logs.md](./06-console-logs.md) — Debug artifacts left in production paths
- [07-styling.md](./07-styling.md) — Dark mode gaps, inline styles, mixed Tailwind patterns
