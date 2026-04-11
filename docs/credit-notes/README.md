# Credit notes

This folder documents how **credit notes** work in Foroman. Credit notes correct or reverse amounts for wrongly invoiced items; they are stored in the same tables as invoices with a discriminator column.

For canonical SQL migrations, see [../project-database-schema.md](../project-database-schema.md) (section 7).

---

## Mental model

- A **credit note** is a row in `invoices` with `document_kind = 'credit_note'`.
- Line items live in **`invoice_items`** (same as invoices), keyed by `invoice_id`.
- **Totals in the database are always positive** (subtotal, tax, total). The app treats credit notes as **negative for AR** only where balances or running statements are computed.
- The **original invoice is not modified**; the credit note is a separate document linked optionally via `credited_invoice_id`.

---

## Database (Skaftin)

| Column | Type | Purpose |
|--------|------|---------|
| `document_kind` | `VARCHAR(20)`, default `'invoice'` | `'invoice'` or `'credit_note'`. |
| `credited_invoice_id` | `INTEGER NULL`, FK → `invoices(id)` `ON DELETE SET NULL` | Source invoice when the credit note applies to a specific invoice. |

**Constraints**

- Do not store negative `total` / `subtotal` for credit notes; use the ledger helper in the app for signed amounts.
- If the referenced invoice is deleted, `credited_invoice_id` becomes `NULL` (FK behavior).

---

## TypeScript types

Defined in [`src/types/invoice.ts`](../../src/types/invoice.ts):

- `InvoiceDocumentKind`: `'invoice' | 'credit_note'`
- `Invoice.document_kind` (optional in TS; DB default is `'invoice'`)
- `Invoice.credited_invoice_id`
- `CreateInvoiceDto` includes the same fields for create/update payloads.

Zod: [`src/validation/schemas.ts`](../../src/validation/schemas.ts) — `invoiceSchema` allows optional `document_kind` and `credited_invoice_id`.

API normalization: [`src/services/invoiceService.ts`](../../src/services/invoiceService.ts) — `normalizeInvoice` coerces `document_kind` and `credited_invoice_id` from API responses.

---

## Ledger helpers (single source of truth for AR sign)

File: [`src/utils/invoiceLedger.ts`](../../src/utils/invoiceLedger.ts)

| Function | Role |
|----------|------|
| `normalizeDocumentKind(kind)` | Maps unknown/null to `'invoice'` unless value is `'credit_note'`. |
| `isCreditNoteInvoice(invoice)` | True when document is a credit note. |
| `getInvoiceLedgerAmount(invoice)` | Returns `+total` for invoices, `-total` for credit notes. |

**Use `getInvoiceLedgerAmount` anywhere a monetary total from `invoices` affects “amount owed” or running balance.** Do not sum `invoice.total` blindly for AR.

---

## Numbering

- **Invoices**: [`peekNextInvoiceNumber`](../../src/stores/data/InvoiceStore.ts) counts rows with `document_kind: 'invoice'` (and `business_id` when current business is set), then zero-pads (e.g. `0001`).
- **Credit notes**: [`peekNextCreditNoteNumber`](../../src/stores/data/InvoiceStore.ts) counts `document_kind: 'credit_note'` with the same business scoping, formats **`CN-0001`**, **`CN-0002`**, … and stores the full string in `invoice_number`.

---

## User flows

### Create from an existing invoice

1. From **invoice detail** ([`InvoiceDetail.tsx`](../../src/components/elements/InvoiceDetail.tsx)), use **Create credit note** (only when the document is not already a credit note).
2. Navigates to:  
   `/app/invoices/create?credit_from=<sourceInvoiceId>&company_id=...&project_id=...` (project/company optional but passed when known).
3. [`InvoiceFormPage`](../../src/pages/admin/InvoiceFormPage.tsx) reads `credit_from` and passes `creditFromInvoiceId` to [`InvoiceForm`](../../src/components/elements/InvoiceForm.tsx).
4. Form prefills customer, project, currency, tax, discount, and **copies line items** from the source; user may edit quantities or remove lines for partial credits.
5. New row is saved with `document_kind: 'credit_note'`, `credited_invoice_id` set to the source id, and a new `CN-*` number.

### Cancel while creating from credit flow

`InvoiceFormPage` `onCancel` returns to `/app/invoices/<credit_from>` when applicable.

### After successful create

Navigates to `/app/invoices/<newId>` (the new credit note detail).

---

## Where credit notes affect reporting

| Area | File | Behavior |
|------|------|----------|
| Company balance (owed / credit) | [`CompanySummaryTab.tsx`](../../src/pages/admin/companies/companyPage/tabs/CompanySummaryTab.tsx) | Balance uses `getInvoiceLedgerAmount`. “Invoiced” subtotal sums **only** normal invoices; credit note totals are shown separately in the footnote. |
| Statements (UI + PDF) | [`CompanyStatementsTab.tsx`](../../src/pages/admin/companies/companyPage/tabs/CompanyStatementsTab.tsx), [`statementPdf.ts`](../../src/utils/statementPdf.ts) | Credit notes appear as **credits** (same side as payments), not debits. `StatementRow.type` can be `'credit_note'`. |
| Dashboard / company invoice lists | [`DashboardPage.tsx`](../../src/pages/admin/DashboardPage.tsx) (`RecentInvoicesTable`), [`CompanyInvoicesTab.tsx`](../../src/pages/admin/companies/companyPage/tabs/CompanyInvoicesTab.tsx) | **CN** chip next to document number on credit notes; company tab title is “Invoices” with a short subtitle that still mentions credit notes. |

**Not** using signed totals for: individual line displays, PDF line amounts (remain positive; title says “Credit note”).

---

## PDF export

[`src/utils/invoicePdf.ts`](../../src/utils/invoicePdf.ts)

- Title **Credit note** vs **Invoice**.
- Loads source invoice by `credited_invoice_id` when present to add a note: relation to original invoice number.
- Download filename prefix: `credit-note-...` vs `invoice-...`.

---

## Deletion

Same delete path as invoices ([`InvoiceStore.removeInvoice`](../../src/stores/data/InvoiceStore.ts)). Confirm copy in UI distinguishes credit note vs invoice.

---

## Edge cases and rules for future changes

1. **Do not create a credit note from a credit note** — blocked in the form prefill with an error.
2. **Quotation conversion** — credit notes only reference **invoices** (`credited_invoice_id`), not quotations.
3. **Schema / API changes** — Before altering Skaftin tables or request shapes, verify live schema via Skaftin MCP and project SDK docs (see workspace rules).
4. **New screens that sum `Invoice.total`** — grep for `inv.total` / `invoice.total` and decide: display amount vs AR effect; use `getInvoiceLedgerAmount` for the latter.

---

## Quick file index

| Concern | Primary files |
|---------|----------------|
| Types | `src/types/invoice.ts` |
| Validation | `src/validation/schemas.ts` |
| AR sign / kind checks | `src/utils/invoiceLedger.ts` |
| CRUD + normalize | `src/services/invoiceService.ts` |
| Numbering + create/save lines | `src/stores/data/InvoiceStore.ts` |
| Form + prefill | `src/components/elements/InvoiceForm.tsx`, `src/pages/admin/InvoiceFormPage.tsx` |
| Detail + CTA | `src/components/elements/InvoiceDetail.tsx` |
| PDF | `src/utils/invoicePdf.ts` |
| Statements | `src/pages/admin/companies/companyPage/tabs/CompanyStatementsTab.tsx`, `src/utils/statementPdf.ts` |
| Company summary | `src/pages/admin/companies/companyPage/tabs/CompanySummaryTab.tsx` |

---

## Changelog (high level)

- Credit notes added as `invoices.document_kind` + `credited_invoice_id`, separate **CN-** numbering, ledger helper for balances/statements, UI from invoice detail and list badges.

When extending this feature, update this README so LLMs and humans stay aligned with behavior and file locations.
