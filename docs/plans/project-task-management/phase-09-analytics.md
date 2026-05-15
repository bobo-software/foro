# Phase 9: Analytics & insights

**Status:** Planning. **Progress:** [PROGRESS.md](./PROGRESS.md).

**Prerequisite:** Enough historical data pipelines from tasks, time, and invoices—usually **after** phases 7–8 or partial 7.

**Vision reference:** [../README.md](../README.md) — project dashboard, business insights, AI-assisted summaries (later “Phase 4”).

## Objective (planning)

Aggregated views: project health, overdue tasks, budget vs actual, revenue per project, team throughput.

## Suggested direction

- Start with **read-only dashboards** using existing Skaftin select/query patterns; avoid heavy client-side aggregation on huge datasets without pagination.
- Charting: align with stack already used in Foro (e.g. ApexCharts per vision doc) unless product standardizes elsewhere.

## Deliverables when activated

- [ ] Dashboard route(s) and widget definitions.
- [ ] `docs/02-modules/` for each dashboard or report.
- [ ] Optional export (CSV) later—separate small phase if needed.

## Out of scope here

- AI summaries and forecasting (treat as their own spike when models and privacy policy are ready).
