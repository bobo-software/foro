# Debt: Type Safety

## `any` Types

### Resolved

- `src/components/forms/AppLabledAutocomplete.tsx` — made generic (`AppLabledAutocomplete<T>`); internal `getField` cast helper used
- `src/backend/services/WebSocketService.ts` — `data`/`oldData` changed to `unknown`; `WsMessage` interface + `isWsMessage` type guard added for `handleMessage`
- `src/backend/types/api.types.ts` — `rows: any[]` changed to `rows: unknown[]`
- `src/backend/client/SkaftinClient.ts` — all `any` replaced with `unknown`; `createHttpError` helper eliminates `(error as any).status/data` casts; `isRetryable` narrows via `instanceof Error`
- `src/backend/utils/request.ts` — rewritten; `ApiError` class with typed fields; all `catch (error: any)` → `catch (error: unknown)`

### Acceptable Exceptions

- `src/pages/admin/Onboard.tsx` — `google?: any` on the `window` object for Google Maps; acceptable until `@types/google.maps` is installed

---

## Unsafe Type Casts

The `normalizeInvoice` / `normalizeQuotation` functions end with `} as Invoice` / `} as Quotation` spread-then-cast. This is the only remaining pattern.

Eliminating it would require either:
- Explicit field-by-field mapping (verbose but type-safe), or
- A validation library like Zod (significant dependency + schema maintenance)

Acceptable for now. The cast is isolated to two normalisation functions and fails loudly if a required numeric field is missing (Math coercion returns `NaN`).

---

## Missing Prop Interfaces

All resolved:

- `src/components/auth/AuthProvider.tsx` — resolved
- `src/components/elements/ProtectedRoute.tsx` — resolved
- `src/components/modals/NewTaskModal.tsx` — resolved
- `src/components/modals/ManageCategoriesModal.tsx` — resolved
- `src/components/websocket/WebSocketProvider.tsx` — resolved

---

## Recommended tsconfig Flags

Add to `tsconfig.json` to surface remaining issues at compile time:

```json
"noImplicitAny": true,
"noUnusedLocals": true,
"noUnusedParameters": true,
"strictNullChecks": true
```
