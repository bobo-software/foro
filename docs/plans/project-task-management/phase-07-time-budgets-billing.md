# Phase 7: Time, budgets, and billing integration

**Prerequisite:** Phases 1–6 complete (or an explicit decision to parallelize only research).

**Vision reference:** [../README.md](../README.md) — “Phase 2” product roadmap (time tracking, project budgets, invoice integration, notifications).

## Objective (planning only until prioritized)

Connect **operational** work (tasks) to **financial** outcomes: logged time, budget burn, and smoother invoice/quotation flows tied to projects.

## Suggested modules (split into future PRs when executed)

1. **Time entries** table + service: link to `task_id` / `project_id`, billable flag, duration or start/end.
2. **Timers** UI (start/stop) and manual entry form.
3. **Project budgets** fields on `projects` (or related table); rollups from time and/or invoiced amounts.
4. **Invoice integration**: draft lines from billable time; surface task/time summary on invoice create/edit (reuse existing `project_id` on invoices).

## Workflow reminder

Each sub-module needs its own **Skaftin MCP + client-sdk** verification before implementation (same rule as phase 1).

## Deliverables when this phase is activated

- [ ] Scoped mini-plan per submodule (or further `phase-07a-*` files if the work is large).
- [ ] Schema docs in `docs/03-database/`.
- [ ] User-facing doc updates in `docs/02-modules/`.

## Out of scope here

- Client portal, Gantt, automation (see [phase-08-portal-gantt-automation.md](./phase-08-portal-gantt-automation.md)).
