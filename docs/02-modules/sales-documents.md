# Sales documents (invoices, quotations, credit notes)

Live lists, company tabs, statements, the payment invoice picker, dashboard widgets, and MCP `sales_list_*` / `sales_get_*` only show **active** sales documents (`deleted_at` is null).

## Trash

Deleting an invoice, credit note, or quotation from the detail page or company invoice menu **moves it to trash** (`deleted_at`). It stays restorable for **3 months**, then a daily 03:00 API cron ([`purgeExpiredSalesDocuments`](../../../foro-api/src/jobs/purgeExpiredSalesDocuments.ts)) permanently deletes the row and its line items (and reverses stock for invoices).

- **Trash tab:** [`/app/documents/trash`](../../src/pages/admin/DocumentsTrashPage.tsx) on [`DocumentsPage`](../../src/pages/admin/DocumentsPage.tsx)
- **Restore:** Trash table **Restore** button, or **Restore** on the document detail (edit/print/convert are hidden while trashed)
- REST `GET /:id` still returns a trashed row so the detail page can restore it. MCP get tools do **not**.
- Document numbers stay reserved while a row is in trash so a new invoice/quotation cannot reuse the same number
- Converted quotations keep `converted_invoice_id` until hard-delete; restoring the invoice does not break the link

## API (foro-api)

| Action | HTTP |
|--------|------|
| List live | `GET /api/v1/invoices` / `quotations` |
| List trash | `GET …?trashed=true` |
| Include trash (number peek) | `GET …?includeTrashed=true` |
| Move to trash | `DELETE /api/v1/invoices/:id` or `/quotations/:id` |
| Restore | `POST /api/v1/invoices/:id/restore` or `/quotations/:id/restore` |
