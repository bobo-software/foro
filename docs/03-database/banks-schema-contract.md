# Banks database contract

Reference catalog of South African banks (BASA) used for banking detail forms and branch-code auto-fill.

## MCP-validated baseline

Validated through Skaftin MCP:

- Table `banks` exists in project schema `project_foroman_1770020084991`.
- 33 active South African banks seeded from payment-gateway catalog data.
- `code` / `longcode` hold universal branch codes used when a user selects a bank.

## Schema: `banks`

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | Internal row id |
| `external_id` | integer unique | Upstream catalog id |
| `name` | varchar(255) | Display name in selects |
| `slug` | varchar(255) | Stable identifier |
| `code` | varchar(32) | Universal branch code |
| `longcode` | varchar(32) | Alternate branch code |
| `gateway` | varchar(255) | Payment gateway id, nullable |
| `pay_with_bank` | boolean | Gateway capability flag |
| `supports_transfer` | boolean | Transfer support flag |
| `available_for_direct_debit` | boolean | Direct debit flag |
| `active` | boolean | Shown in UI when true |
| `country` | varchar(100) | Default `South Africa` |
| `currency` | varchar(3) | Default `ZAR` |
| `type` | varchar(32) | e.g. `basa` |
| `is_deleted` | boolean | Soft-delete flag |
| `created_at` | timestamp | Row creation time |
| `updated_at` | timestamp | Last update, nullable |

## Frontend usage

- `BankService.findActive()` — loads `active = true` and `is_deleted = false`, ordered by name.
- `useBankStore` — Zustand cache; call `fetchBanks()` before rendering bank selects.
- Selecting a bank auto-fills `branch_code` from `bank.code`.

## API

Standard Skaftin table select:

`POST /app-api/database/tables/banks/select`

Typical query:

```json
{
  "where": { "active": true, "is_deleted": false },
  "orderBy": "name",
  "orderDirection": "ASC",
  "limit": 500
}
```
