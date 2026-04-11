# AppDataTable

Lightweight, accessible HTML table wrapped in a **card** for list-style admin screens. Uses Tailwind for layout and typography (`text-xs` body). Prefer this over ad-hoc `<table>` markup or Material React Table when you only need sorting handled in data, row click, and simple columns.

**Source:** [`AppDataTable.tsx`](./AppDataTable.tsx)

---

## Modes

### Full card (default)

Renders a bordered card with an optional **title row** (icon + `AppText` heading) above the scrollable table. Use on standalone pages (e.g. companies list, dashboard widgets).

- Set `title` and optionally `titleIcon` (e.g. `<LuUsers />`).
- Omit `embedded` or pass `embedded={false}`.

### Embedded

`embedded={true}` skips the outer card and the title row. Only the inner block is rendered: error banner (if any), loading / empty states, or the `<table>`.

Use inside a parent that already provides the section heading and card chrome (e.g. company detail tabs: quotations, invoices, payments).

---

## Props (`AppDataTableProps<T>`)

| Prop | Type | Description |
|------|------|-------------|
| `columns` | `AppDataTableColumn<T>[]` | Column definitions (see below). |
| `data` | `T[]` | Rows to render. |
| `getRowKey` | `(row, index) => string \| number` | Stable React key. |
| `getRowClassName?` | `(row) => string` | Extra `className` merged onto `<tr>` (e.g. credit-note tint). Default adds hover styles. |
| `onRowClick?` | `(row) => void` | Makes rows `cursor-pointer` and clickable. |
| `loading?` | `boolean` | Shows “Loading…” instead of the table. |
| `error?` | `string \| null` | Optional amber banner above the body. |
| `emptyMessage?` | `string` | Shown when `data.length === 0`. |
| `title?` | `string` | Card title (ignored if `embedded`). |
| `titleIcon?` | `ReactNode` | Icon before title (ignored if `embedded`). |
| `embedded?` | `boolean` | Embedded mode (see above). |

---

## Columns (`AppDataTableColumn<T>`)

| Field | Description |
|-------|-------------|
| `id` | Stable key for header/cell. |
| `header` | Header label (string). |
| `render` | `(row) => ReactNode` cell content. |
| `align?` | `'left'` \| `'right'` \| `'center'`. |
| `headerClassName?` | Classes on `<th>` (e.g. width). |
| `cellClassName?` | Classes on `<td>`. |

**Row actions:** If a cell has buttons (menus, delete), call `event.stopPropagation()` on the control so `onRowClick` does not fire.

---

## Usage in this repo

| Location | Mode |
|----------|------|
| [`CompaniesPage.tsx`](../../../pages/admin/companies/CompaniesPage.tsx) | Full card |
| [`ItemList.tsx`](./ItemList.tsx) | Full card |
| [`RecentInvoicesTable.tsx`](./RecentInvoicesTable.tsx) | Full card (dashboard) |
| [`CompanyQuotationsTab.tsx`](../../../pages/admin/companies/companyPage/tabs/CompanyQuotationsTab.tsx) | Embedded |
| [`CompanyInvoicesTab.tsx`](../../../pages/admin/companies/companyPage/tabs/CompanyInvoicesTab.tsx) | Embedded |
| [`CompanyPaymentsTab.tsx`](../../../pages/admin/companies/companyPage/tabs/CompanyPaymentsTab.tsx) | Embedded |

Re-exports: [`ComponentsIndex.ts`](../ComponentsIndex.ts) (`AppDataTable`, `AppDataTableColumn`, `AppDataTableProps`).

---

## When not to use

- Heavy grid features (column resize, multi-sort, Excel export): consider a data-grid library.
- Very large datasets without virtualization: consider windowing or server pagination first.
