# Debt: Monolithic Components

Six components exceeded 800 lines and handle too many concerns. They are hard to read, hard to test, and changes in one section risk breaking unrelated sections.

---

## Resolved

### `InvoiceForm.tsx` — was ~952 lines
`src/components/elements/InvoiceForm.tsx`

Extracted:
- `InvoiceBillableTimeSummary.tsx` — billable time summary panel
- `InvoiceHeaderFields.tsx` — top metadata row (8 fields)

### `CompanyFormPage.tsx` — was ~915 lines
`src/pages/admin/companies/CompanyFormPage.tsx`

Extracted:
- `CompanyAddressFields.tsx` — Google Places lookup + manual address form
- `CompanyCredentialsFields.tsx` — business type, tax ID, registration, VAT, industry, website, notes
- `CompanyBankingFields.tsx` — banking details with toggle checkbox

### `ProjectDetailPage.tsx` — was ~1,810 lines
`src/pages/admin/companies/ProjectDetailPage.tsx`

Extracted:
- `ProjectTimeEntryPanel.tsx` — budget tracking, time logging, live timer, time entry list
- `ProjectTasksCard.tsx` — task list, quick-add form, list/timeline view toggle, filters

### `BusinessSettingsTab.tsx` — was ~845 lines
`src/pages/admin/settings/tabs/BusinessSettingsTab.tsx`

Extracted shared sub-components (reused by both `BusinessSettingsTab` and `CreateBusinessForm`):
- `BusinessAddressSection.tsx` — street address, suburb, city, province, postal code, country
- `BusinessCredentialsSection.tsx` — tax ID, registration number, VAT number

### `QuotationForm.tsx` — was ~802 lines
`src/components/elements/QuotationForm.tsx`

Extracted:
- `QuotationHeaderFields.tsx` — 8 document header fields (quotation #, order #, status, currency, issue date, valid until, terms, delivery conditions)

---

## Remaining

---

## General Guidance

A component is too large when:
- It has more than ~2 distinct user workflows
- It manages more than ~4 pieces of independent state
- A new developer cannot understand it without scrolling

Target: keep page-level components under 400 lines, leaf components under 200.
