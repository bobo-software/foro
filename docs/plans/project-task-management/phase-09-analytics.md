# Phase 9: Analytics & insights

**Status:** **9a–9c shipped** (in-page insights, loaded-data CSV export, business projects overview). **Progress:** [PROGRESS.md](./PROGRESS.md). **Backend deferred:** [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md).

**Prerequisite:** Enough historical data pipelines from tasks, time, and invoices—usually **after** phases 7–8 or partial 7.

**Vision reference:** [../README.md](../README.md) — project dashboard, business insights, AI-assisted summaries (later “Phase 4”).

## Shipped (9a) — project detail insights card

- **UI:** [`ProjectInsightsCard.tsx`](../../../src/pages/admin/companies/ProjectInsightsCard.tsx) on project detail — metrics from **loaded** tasks + time entries only (no new list queries).
- **Module doc:** [project-insights-analytics.md](../../02-modules/project-insights-analytics.md).

## Shipped (9b) — CSV export (loaded rows, client-only)

- **Utils:** [`csvDownload.ts`](../../../src/utils/csvDownload.ts) — RFC-style escaping, UTF-8 BOM, browser download.
- **UI:** **Export tasks (CSV)** / **Export time (CSV)** on the Insights card; exports whatever is already in memory on project detail (respect list filters / Load more for tasks and time).
- **No backend:** full-project export and server aggregates remain on [BACKEND-WISHLIST-SKAFTIN.md](./BACKEND-WISHLIST-SKAFTIN.md).

## Objective (planning)

Aggregated views: project health, overdue tasks, budget vs actual, revenue per project, team throughput.

## Suggested direction

- Start with **read-only dashboards** using existing Skaftin select/query patterns; avoid heavy client-side aggregation on huge datasets without pagination.
- Charting: align with stack already used in Foro (e.g. ApexCharts per vision doc) unless product standardizes elsewhere.

## Shipped (9c) — business projects overview

- **Route:** `/app/projects` — [`ProjectsOverviewPage.tsx`](../../../src/pages/admin/projects/ProjectsOverviewPage.tsx) (sidebar **Projects**).
- **Data:** `ProjectService.findAll` + paged `TaskService.findAll` by `business_id` (cap 3000 tasks) + per-project `TimeEntryService.sumBillableMinutesForProject` (sequential, same rollup as project detail).
- **Utils:** [`projectOverviewMetrics.ts`](../../../src/utils/projectOverviewMetrics.ts) — rollups, row builder, CSV export.
- **Nav:** [`AppSidebar.tsx`](../../../src/components/elements/AppSidebar.tsx), breadcrumbs in [`AppNavbar.tsx`](../../../src/components/elements/AppNavbar.tsx).

## Deliverables when activated

- [x] First `docs/02-modules/` slice for on-page insights ([project-insights-analytics.md](../../02-modules/project-insights-analytics.md)) — **9a**.
- [x] **Loaded-data CSV export** on project detail — **9b** (not a full server dump).
- [x] Business **Projects overview** route + table/summary — **9c** (client aggregates; no new Skaftin endpoints).

## Out of scope here

- AI summaries and forecasting (treat as their own spike when models and privacy policy are ready).
