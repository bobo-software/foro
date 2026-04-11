# UI: data tables (`AppDataTable`)

Foroman uses a single shared table component for consistent list UX across admin pages.

## Component

- **Implementation:** [`src/components/elements/AppDataTable.tsx`](../../src/components/elements/AppDataTable.tsx)
- **Authoring guide (props, columns, embedded vs card):** [`src/components/elements/AppDataTable.md`](../../src/components/elements/AppDataTable.md)

## Where it appears

- **Companies hub:** company list only (recent-invoice block was removed); table shows companies with search and “Add company”.
- **Items (stock):** [`ItemList`](../../src/components/elements/ItemList.tsx) lists SKUs with search, row click to open detail, and icon actions (view / edit / delete) that do not trigger navigation.
- **Company detail — tabs:** quotations, invoices (and credit notes), and payments each use **embedded** `AppDataTable` inside the tab card.
- **Dashboard:** recent invoices via `RecentInvoicesTable`, which wraps `AppDataTable` with invoice-specific columns and credit-note styling.

## Conventions

- Sort and filter in parent code (e.g. `useMemo` on props) before passing `data`.
- Use `getRowClassName` for row-level emphasis (see `invoiceTableRowClassName` in [`src/utils/invoiceLedger.ts`](../../src/utils/invoiceLedger.ts)).
- Interactive cells that should not navigate on row click must stop propagation on the inner control.
