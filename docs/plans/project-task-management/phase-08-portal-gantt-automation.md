# Phase 8: Client portal, Gantt, automation

**Prerequisite:** Phase 7 or a product decision to reorder; typically **after** core internal PM + time/budgets are stable.

**Vision reference:** [../README.md](../README.md) — “Phase 3” (client portal, Gantt, automation, analytics dashboards overlap).

## Objective (planning)

Expand outward: **external** visibility (client portal), **planning** views (Gantt/timeline), and **rules** (automation) that reduce manual updates.

## Suggested workstreams (execute as separate initiatives)

1. **Client portal**: auth model, scoped project read, approvals, file exchange—major security and product design effort.
2. **Gantt / timeline**: library choice (e.g. frappe-gantt, FullCalendar timeline); dependency graph storage if not MVP-simple.
3. **Automation**: event triggers (task completed → notify; quote accepted → seed tasks)—likely needs Skaftin-side hooks or a job runner strategy.

## Deliverables when activated

- [ ] Architecture note in `docs/00-overview/` or `docs/02-modules/` per initiative.
- [ ] Permissions model updates in `docs/01-roles/` for any client-facing access.

## Out of scope here

- Cross-business analytics and AI features (see [phase-09-analytics.md](./phase-09-analytics.md) and vision “Phase 4”).
