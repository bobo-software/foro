/**
 * Client statement portal service — public, OTP-gated. Talks to
 * `/api/v1/statement-portal/*` via the dedicated `statementPortalApiClient`
 * (its own sessionStorage-backed token, separate from the admin session).
 */

import { statementPortalApiClient } from '../backend/client/StatementPortalApiClient';
import type { AccountType, BankingDetails } from '../types/bankingDetails';
import type { Business } from '../types/business';
import type { Invoice, InvoiceItem } from '../types/invoice';
import type { StatementPortalCompany, StatementRow } from '../types/statementPortal';
import { normalizeDocumentKind } from '../utils/invoiceLedger';

const BASE = '/api/v1/statement-portal';

interface ApiCompanyRow {
  id: number;
  name: string;
  address: string | null;
  logoUrl: string | null;
  phone: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  documentTemplate: string | null;
  showLogoOnDocuments: boolean | null;
  taxEnabled: boolean | null;
  businessId: number | null;
}

interface ApiBankingDetailsRow {
  id: number;
  label: string | null;
  bankName: string;
  accountHolder: string | null;
  accountNumber: string;
  accountType: string | null;
  branchCode: string | null;
  branchName: string | null;
  swiftCode: string | null;
  iban: string | null;
}

interface ApiBusinessRow extends ApiCompanyRow {
  bankingDetails: ApiBankingDetailsRow | null;
}

interface ApiInvoiceRow {
  id: number;
  companyId: number | null;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  subtotal: string;
  taxRate: string | null;
  taxAmount: string | null;
  total: string;
  notes: string | null;
  currency: string | null;
  customerVatNumber: string | null;
  deliveryAddress: string | null;
  deliveryConditions: string | null;
  orderNumber: string | null;
  terms: string | null;
  discountPercent: string | null;
  documentKind: string | null;
  creditedInvoiceId: number | null;
}

interface ApiInvoiceItemRow {
  id: number;
  invoiceId: number;
  itemId: number | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  sku: string | null;
  unitType: string | null;
  discountPercent: string | null;
}

function normalizeCompany(row: ApiCompanyRow): StatementPortalCompany {
  return { id: row.id, name: row.name, businessId: row.businessId };
}

function normalizeBusiness(row: ApiBusinessRow | null): Business | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    vat_number: row.vatNumber ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    logo_url: row.logoUrl ?? undefined,
    document_template: (row.documentTemplate as Business['document_template']) ?? undefined,
    show_logo_on_documents: row.showLogoOnDocuments ?? undefined,
    tax_enabled: row.taxEnabled ?? undefined,
  };
}

function normalizeBankingDetails(row: ApiBankingDetailsRow | null | undefined): BankingDetails | null {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label ?? undefined,
    bank_name: row.bankName,
    account_holder: row.accountHolder ?? undefined,
    account_number: row.accountNumber,
    account_type: (row.accountType as AccountType) ?? undefined,
    branch_code: row.branchCode ?? undefined,
    branch_name: row.branchName ?? undefined,
    swift_code: row.swiftCode ?? undefined,
    iban: row.iban ?? undefined,
  };
}

function normalizeInvoice(row: ApiInvoiceRow): Invoice {
  return {
    id: row.id,
    company_id: row.companyId,
    document_kind: normalizeDocumentKind(row.documentKind ?? undefined),
    credited_invoice_id: row.creditedInvoiceId,
    invoice_number: row.invoiceNumber,
    customer_name: row.customerName,
    customer_email: row.customerEmail ?? undefined,
    customer_address: row.customerAddress ?? undefined,
    customer_vat_number: row.customerVatNumber ?? undefined,
    delivery_address: row.deliveryAddress ?? undefined,
    delivery_conditions: row.deliveryConditions ?? undefined,
    order_number: row.orderNumber ?? undefined,
    terms: row.terms ?? undefined,
    issue_date: row.issueDate,
    due_date: row.dueDate,
    status: (row.status as Invoice['status']) ?? 'sent',
    subtotal: Number(row.subtotal) || 0,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    tax_amount: row.taxAmount != null ? Number(row.taxAmount) : undefined,
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    total: Number(row.total) || 0,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function normalizeInvoiceItem(row: ApiInvoiceItemRow): InvoiceItem {
  return {
    id: row.id,
    invoice_id: row.invoiceId,
    item_id: row.itemId ?? undefined,
    sku: row.sku ?? undefined,
    description: row.description,
    quantity: row.quantity,
    unit_price: Number(row.unitPrice) || 0,
    unit_type: (row.unitType as InvoiceItem['unit_type']) ?? undefined,
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    total: Number(row.total) || 0,
  };
}

export class StatementPortalService {
  static hasSession(): boolean {
    return statementPortalApiClient.hasSession();
  }

  static logout(): void {
    statementPortalApiClient.clearToken();
  }

  static async requestOtp(email: string): Promise<string> {
    const res = await statementPortalApiClient.post<null>(`${BASE}/otp/request`, { email });
    return res.message ?? 'If this email is a registered primary contact, a code has been sent.';
  }

  static async verifyOtp(email: string, otp: string): Promise<StatementPortalCompany[]> {
    const res = await statementPortalApiClient.post<{ accessToken: string; companies: StatementPortalCompany[] }>(
      `${BASE}/otp/verify`,
      { email, otp },
    );
    statementPortalApiClient.setToken(res.data.accessToken);
    return res.data.companies;
  }

  static async listCompanies(): Promise<StatementPortalCompany[]> {
    const res = await statementPortalApiClient.get<{ companies: ApiCompanyRow[] }>(`${BASE}/companies`);
    return res.data.companies.map(normalizeCompany);
  }

  static async getStatement(companyId: number): Promise<{
    company: StatementPortalCompany;
    business: Business | null;
    bankingDetails: BankingDetails | null;
    rows: StatementRow[];
  }> {
    const res = await statementPortalApiClient.get<{
      company: ApiCompanyRow;
      business: ApiBusinessRow | null;
      rows: StatementRow[];
    }>(`${BASE}/companies/${companyId}/statement`);
    return {
      company: normalizeCompany(res.data.company),
      business: normalizeBusiness(res.data.business),
      bankingDetails: normalizeBankingDetails(res.data.business?.bankingDetails),
      rows: res.data.rows,
    };
  }

  static async getInvoice(
    companyId: number,
    invoiceId: number,
  ): Promise<{
    invoice: Invoice;
    lineItems: InvoiceItem[];
    business: Business | null;
    bankingDetails: BankingDetails | null;
  }> {
    const res = await statementPortalApiClient.get<{
      invoice: ApiInvoiceRow;
      lineItems: ApiInvoiceItemRow[];
      business: ApiBusinessRow | null;
    }>(`${BASE}/companies/${companyId}/invoices/${invoiceId}`);
    return {
      invoice: normalizeInvoice(res.data.invoice),
      lineItems: res.data.lineItems.map(normalizeInvoiceItem),
      business: normalizeBusiness(res.data.business),
      bankingDetails: normalizeBankingDetails(res.data.business?.bankingDetails),
    };
  }
}

export default StatementPortalService;
