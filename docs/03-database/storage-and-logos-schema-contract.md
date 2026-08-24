# Storage and logos — schema contract

**MCP:** validated with `get_table_schema` on Cursor server `project-0-foro-skaftin` (see [`.cursor/mcp.json`](../../.cursor/mcp.json)).

## MinIO bucket (not a SQL table)

| Field | Value |
|-------|--------|
| Bucket name | `foroman` |
| Access policy | `public` (Skaftin project buckets listing) |
| App constant | `BUCKET_NAME` in [`storageService.ts`](../../src/services/storageService.ts) |

Object keys are **not** stored in a dedicated table. Only the **path within the bucket** is persisted in `companies.logo_url`.

## `companies.logo_url`

| Column | Type | Nullable | Semantics |
|--------|------|----------|-----------|
| `logo_url` | `text` | yes | MinIO object **path** inside bucket `foroman`, **not** a full URL |

Examples:

| Role | Typical path pattern | Set by |
|------|----------------------|--------|
| Owner / issuer business (`is_owner_company = true`) | `{businessId}/company_logo.png` | `StorageService.uploadCompanyLogo` |
| Client company (`is_owner_company` false or null) | `companies/{companyId}/logo.png` | `StorageService.uploadClientCompanyLogo` |

`businessId` for issuer logos is the owner company row `companies.id` (see [`BusinessService`](../../src/services/businessService.ts) → `CompanyService` with `is_owner_company: true`).

Related columns on the same table:

| Column | Type | Purpose |
|--------|------|---------|
| `show_logo_on_documents` | `boolean` | When true, PDF generators embed logo via [`pdfLogoHelper`](../../src/utils/pdfLogoHelper.ts) |
| `document_template` | `varchar` | PDF layout (`classic`, etc.) |
| `tax_enabled` | `boolean` | Default `true`. When false, the Tax %/VAT input and totals line are hidden on invoice and quotation forms, detail views, and generated PDFs (`InvoiceForm.tsx`, `QuotationForm.tsx`, `InvoiceDetail.tsx`, `QuotationDetail.tsx`, `generateStandardDocumentPdf.ts`). The customer VAT # field is additionally gated on the business having its own `vat_number` set. |

## Presigned URLs

- Generated at read time: `GET /app-api/storage/files/download?bucket=foroman&path={encodeURIComponent(logo_url)}&returnUrl=true`
- Default expiry ~1 hour; **do not** persist presigned URLs in `logo_url`
- Regenerate on each display/PDF build

## Upload API (reference)

Multipart upload used by the app:

```
POST /app-api/storage/files
Form: file, bucket=foroman, path=<object key>
```

See [04-STORAGE-REQUESTS.md](../../client-sdk/requests/04-STORAGE-REQUESTS.md) and [storage module doc](../02-modules/storage.md).

## Operational checks

1. `list_project_buckets` (MCP) includes `foroman`
2. Test `POST /app-api/storage/files` with `bucket=foroman` returns **201**
3. After upload, `companies.logo_url` matches the `path` sent in the form
4. `GET .../files/download?...&returnUrl=true` returns a reachable URL
