# Known issues / follow-ups

Running log of open issues found while testing the Skaftin → foro-api migration
end-to-end. Fixed items are removed once resolved and verified — see git history /
commit messages for what changed and why if you need that record.

## Open follow-ups

- **Updates can't explicitly clear an optional field to `NULL`.** A side effect
  of the `stripNulls` fix in `foro-api/src/lib/crudRouter.ts` (optional fields
  sent as explicit `null` are stripped before validation, since `null` and
  "omitted" are equivalent for creates): PUT requests now silently ignore
  `null`-valued keys rather than erroring, but that means there's currently no
  way to, say, unassign a task's `assignedToUserId` or clear a project's
  `endsOn` via the generic CRUD PUT — the old value just stays. Not currently
  exercised by any UI flow, but worth a real "clear to null" mechanism
  (e.g. a sentinel value, or a dedicated PATCH semantic) if that need comes up.
