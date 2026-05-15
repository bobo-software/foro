# Project insights & analytics (Phase 9a–9b)

**Plan:** [phase-09-analytics.md](../plans/project-task-management/phase-09-analytics.md). **Progress:** [PROGRESS.md](../plans/project-task-management/PROGRESS.md). **Deferred backend:** [BACKEND-WISHLIST-SKAFTIN.md](../plans/project-task-management/BACKEND-WISHLIST-SKAFTIN.md).

## Phase 9a (shipped): in-page insights card

[ProjectInsightsCard](../../src/pages/admin/companies/ProjectInsightsCard.tsx) on [ProjectDetailPage](../../src/pages/admin/companies/ProjectDetailPage.tsx) shows **read-only** metrics derived only from **tasks and time entries already loaded** in the SPA (same pages as List / Board / Timeline — no extra Skaftin queries).

- **Tasks loaded:** count of tasks with an id in the current in-memory list.
- **Overdue (open):** open tasks whose `due_on` (date part) is before the viewer’s **local calendar** today ([`localDateISO`](../../src/utils/localDateISO.ts)).
- **Billable / logged hours:** sums `duration_minutes` from the loaded `timeEntries` array (billable vs all).
- **Budget burn bar:** when `project.budget_hours` is set, compares billable hours from loaded entries to that budget (cap at 100% for the bar).
- **By status:** chip counts for statuses present in the loaded task set.

This is intentionally **not** a substitute for server-side analytics or full historical rollups. Use **Load more** on tasks and, on project detail, **Load more time entries** under **Budget and time → Recent entries** (same **50-row pages** as tasks) so the in-memory window matches what you want before trusting totals.

## Phase 9b (shipped): loaded-data CSV export

On project detail, the Insights card offers **Export tasks (CSV)** and **Export time (CSV)**. Files include only rows **already loaded** in the SPA (use **Load more** on tasks and under **Budget and time → Recent entries** for a fuller file). Implementation: [`csvDownload.ts`](../../src/utils/csvDownload.ts), wired from [`ProjectDetailPage.tsx`](../../src/pages/admin/companies/ProjectDetailPage.tsx).

## Phase 9c (shipped): business projects overview

[`ProjectsOverviewPage`](../../src/pages/admin/projects/ProjectsOverviewPage.tsx) at **`/app/projects`** lists all projects for the current business with:

- **Task rollups** from a paged scan of `project_tasks` (up to 3000 rows); overdue uses [`localDateISO`](../../src/utils/localDateISO.ts).
- **Billable hours** per project via `TimeEntryService.sumBillableMinutesForProject` (loads after the table; may show `…` while fetching).
- **Summary tiles**, sortable table, links to `/app/companies/:companyId/projects/:projectId`, and **Export overview (CSV)**.

Metrics helpers: [`projectOverviewMetrics.ts`](../../src/utils/projectOverviewMetrics.ts).

## Later

AI summaries; **full** server-side cross-business aggregates — [BACKEND-WISHLIST-SKAFTIN.md](../plans/project-task-management/BACKEND-WISHLIST-SKAFTIN.md).
