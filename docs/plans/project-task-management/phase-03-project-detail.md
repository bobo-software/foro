# Phase 3: Project detail shell

**Prerequisite:** [phase-02-access-layer.md](./phase-02-access-layer.md) (tasks callable from code); can overlap end of phase 2 if types are stable.

**Blocks:** [phase-04-task-list.md](./phase-04-task-list.md) (tasks UI lives under this shell).

## Objective

Give each project a **dedicated URL** and layout so task features nest naturally under company → project, consistent with existing `CompanyProjectsPage` flows.

## Deliverables

- [ ] Route(s), e.g. `/app/companies/:companyId/projects/:projectId` (exact pattern to match `App.tsx` conventions).
- [ ] Lazy-loaded page component (same pattern as other admin pages).
- [ ] Load project by id; verify `company_id` matches route param (guard against cross-company ids); show 404 or safe empty state if mismatch.
- [ ] Display core project fields (name, code, description, status, dates) reusing existing typography/layout primitives.
- [ ] Navigation: from `CompanyProjectsPage`, each project row links into this detail page; back link to company projects list.
- [ ] Placeholder section or tab label **Tasks** (empty state until phase 4).

## Exit criteria

- Deep-linking to a project works for authenticated users with access to that business.
- No task table required yet; “Tasks coming next” or empty shell is acceptable.

## Out of scope

- Task CRUD UI (phase 4), Kanban (phase 5).
