# Debt: Duplicate / Copy-Paste Logic

## Resolved

### `withIds<T>` filter utility
`src/utils/withIds.ts` — extracted and used in all call sites:
- `ProjectTasksTimeline.tsx`
- `ProjectTaskDependenciesCard.tsx`
- `PortalProjectViewPage.tsx`
- `ProjectInsightsCard.tsx`

### CompanyFormPage vs CompanyEditTab address/banking/credentials sections
Sub-components extracted and reused across `CompanyFormPage`, `CompanyEditTab`, `Onboard`:
- `CompanyAddressFields.tsx`
- `CompanyCredentialsFields.tsx`
- `CompanyBankingFields.tsx`

### BusinessSettingsTab vs CreateBusinessForm address/credentials sections
Sub-components extracted and reused across `BusinessSettingsTab` and `CreateBusinessForm`:
- `BusinessAddressSection.tsx`
- `BusinessCredentialsSection.tsx`

### Document Number Generation
`src/utils/documentNumber.ts` — `computeNextDocumentNumber(numbers: string[], prefix?: string): string` extracted and used by:
- `src/services/quotationService.ts` — `QuotationService.getNextNumber()`
- `src/stores/data/InvoiceStore.ts` — `peekNextInvoiceNumber()` and `peekNextCreditNoteNumber()`

### PDF Generation
`src/utils/pdfTemplates/generateStandardDocumentPdf.ts` — shared `generateStandardDocumentPdf` + `computePdfTotals` used by:
- `src/utils/invoicePdf.ts` — rewritten to use shared generator
- `src/utils/quotationPdf.ts` — rewritten to use shared generator
- `src/utils/statementPdf.ts` — kept separate (ledger table structure differs; not invoice-style)

### `SA_PROVINCES` constant
Extracted to `src/constants/saProvinces.ts` and imported by all consumers:
- `CompanyAddressFields.tsx`
- `CompanyEditTab.tsx`
- `BusinessAddressSection.tsx`

### Inline required-field guards

Audited: 16 occurrences of `if (!x.trim())`. 8 are search-filter early-returns in list components — correct, not debt. The remaining 8 are single-field required checks in forms:

| File | Field |
|------|-------|
| `CompanyEditTab.tsx` | company name |
| `CompanyContactsTab.tsx` | contact name |
| `ProjectsOverviewPage.tsx` | project name |
| `NewTaskModal.tsx` | task title |
| `EditTaskModal.tsx` | task title |
| `ForgotPassword.tsx` | email |
| `VerifyOtp.tsx` | OTP code |
| `VerifyForgotPasswordOtp.tsx` | email + code |

All 8 are single-field, single-message guards. Each form has exactly one required field to check before submit. The existing `src/validation/schemas.ts` covers multi-field validation; these single guards are simpler inline and carry no duplication risk at this scale. Resolved — no further action needed.
