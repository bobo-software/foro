# Phase 3: Project detail shell

**Status:** Done (2026-05-14); shipped together with phase 4 on one page. **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** [phase-02-access-layer.md](./phase-02-access-layer.md) (tasks callable from code); can overlap end of phase 2 if types are stable.

**Blocks:** [phase-04-task-list.md](./phase-04-task-list.md) (tasks UI lives under this shell).

## Objective

Give each project a **dedicated URL** and layout so task features nest naturally under company → project, consistent with existing `CompanyProjectsPage` flows.

## Deliverables

- [x] Route `/app/companies/:companyId/projects/:projectId` in `App.tsx` (more specific route before `projects` index).
- [x] Lazy-loaded [`ProjectDetailPage`](../../../src/pages/admin/companies/ProjectDetailPage.tsx).
- [x] Load project by id; verify `company_id` matches route param (guard against cross-company ids); show safe empty state if mismatch.
- [x] Display core project fields (name, code, description, status) reusing existing layout primitives.
- [x] Navigation: from `CompanyProjectsPage`, **Open project** link; back via `AppPageHeader` to company projects list.
- [x] Tasks section on same page (phase 4 merged here rather than an empty placeholder).

## Exit criteria

- Deep-linking to a project works for authenticated users with access to that business.

## Out of scope

- Kanban (phase 5).
