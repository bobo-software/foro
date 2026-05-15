# Phase 2: Access layer (types, validation, service)

**Status:** Done (2026-05-14). **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** [phase-01-schema-contract.md](./phase-01-schema-contract.md) complete.

**Blocks:** [phase-03-project-detail.md](./phase-03-project-detail.md), [phase-04-task-list.md](./phase-04-task-list.md) (can start phase 3 in parallel only if routes do not yet call tasks; typically run 2 → 3 → 4 in order).

## Objective

Add a thin, testable data layer for tasks that mirrors existing patterns (`ProjectService`, `skaftinClient` table endpoints).

## Deliverables

- [x] `src/types/task.ts` matching phase 1 contract exactly (`snake_case` vs `camelCase` normalization in service, same as `ProjectService`).
- [x] Zod schemas in `src/validation/schemas.ts` (Zod v4 style per AGENTS.md): create/update payloads and enums (`status`, `priority`).
- [x] `TaskService` with `findAll` (filter by `project_id` + `business_id`), `findById`, `create`, `update`, `delete`—same error/normalization patterns as `projectService.ts`.
- [x] Unit tests: schema `safeParse` for valid/invalid payloads in `schemas.test.ts`.

## Exit criteria

- From a temporary script or dev-only page, you can list and mutate tasks for a real `project_id` without UI.
- No new UI routes required for this phase (optional: skip if you prefer minimal PRs and combine with phase 4).

## Out of scope

- Pages, routing, Kanban, assignment picker UI.
