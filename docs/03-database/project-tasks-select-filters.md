# Project tasks — Skaftin `select` filters

When listing `project_tasks`, the Foro app may send a **nested** `title` filter for case-insensitive substring search:

```json
{
  "where": {
    "project_id": 1,
    "business_id": 2,
    "title": { "ilike": "%escaped%" }
  }
}
```

- User input is passed through `escapeIlikePattern` (`src/utils/sqlLikePattern.ts`) so `%` and `_` are literal.
- **Compatibility:** If your Skaftin build rejects `{ "ilike": "..." }`, adjust the shape to match your platform’s documented filter operators and update [`TaskService.findAll`](../../src/services/taskService.ts) callers (currently [`ProjectDetailPage`](../../src/pages/admin/companies/ProjectDetailPage.tsx)) accordingly.

Equality filters (`status`, `project_id`, `business_id`) use plain JSON values as today.
