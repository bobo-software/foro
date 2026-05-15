# Project budget columns — contract

**DDL:** [sql/project-budget-columns.sql](./sql/project-budget-columns.sql)

Adds nullable numeric caps on `projects`:

| Column | Type | Notes |
|--------|------|--------|
| `budget_hours` | NUMERIC(12,2) | Optional planned hours |
| `budget_amount` | NUMERIC(14,2) | Optional budget in company currency (app convention) |

No CHECK constraints; the app validates non-negative numbers before PATCH.
