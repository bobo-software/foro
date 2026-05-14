# Phase 2: Access layer (types, validation, service)

**Prerequisite:** [phase-01-schema-contract.md](./phase-01-schema-contract.md) complete.

**Blocks:** [phase-03-project-detail.md](./phase-03-project-detail.md), [phase-04-task-list.md](./phase-04-task-list.md) (can start phase 3 in parallel only if routes do not yet call tasks; typically run 2 → 3 → 4 in order).

## Objective

Add a thin, testable data layer for tasks that mirrors existing patterns (`ProjectService`, `skaftinClient` table endpoints).

## Deliverables

- [ ] `src/types/task.ts` (or agreed name) matching phase 1 contract exactly (`snake_case` vs `camelCase` normalization documented in service, same as `ProjectService`).
- [ ] Zod schemas in `src/validation/schemas.ts` (Zod v4 style per AGENTS.md): create/update payloads and any enums (`status`, `priority`).
- [ ] `TaskService` with `findAll` (filter by `project_id` + `business_id`), `findById`, `create`, `update`, `delete`—same error/normalization patterns as `projectService.ts`.
- [ ] Unit tests: schema `safeParse` for valid/invalid payloads; optional tests for row normalizers if non-trivial.

## Exit criteria

- From a temporary script or dev-only page, you can list and mutate tasks for a real `project_id` without UI.
- No new UI routes required for this phase (optional: skip if you prefer minimal PRs and combine with phase 4).

## Out of scope

- Pages, routing, Kanban, assignment picker UI.
