/**
 * Invoice Service
 * Handles all invoice-related API calls
 */

import { foroApiClient } from '../backend';
import type { Invoice, CreateInvoiceDto } from '../types/invoice';
import { normalizeDocumentKind } from '../utils/invoiceLedger';

const BASE = '/api/v1/invoices';

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
  createdAt: string | null;
  updatedAt: string | null;
  currency: string | null;
  businessId: number | null;
  customerVatNumber: string | null;
  deliveryAddress: string | null;
  deliveryConditions: string | null;
  orderNumber: string | null;
  terms: string | null;
  discountPercent: string | null;
  projectId: number | null;
  documentKind: string | null;
  creditedInvoiceId: number | null;
}

function normalizeInvoice(row: ApiInvoiceRow): Invoice {
  return {
    id: row.id,
    business_id: row.businessId,
    company_id: row.companyId,
    project_id: row.projectId,
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
    status: (row.status as Invoice['status']) ?? 'draft',
    subtotal: Number(row.subtotal) || 0,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    tax_amount: row.taxAmount != null ? Number(row.taxAmount) : undefined,
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    total: Number(row.total) || 0,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateInvoiceDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.project_id !== undefined) body.projectId = data.project_id;
  if (data.document_kind !== undefined) body.documentKind = data.document_kind;
  if (data.credited_invoice_id !== undefined) body.creditedInvoiceId = data.credited_invoice_id;
  if (data.invoice_number !== undefined) body.invoiceNumber = data.invoice_number;
  if (data.customer_name !== undefined) body.customerName = data.customer_name;
  if (data.customer_email !== undefined) body.customerEmail = data.customer_email;
  if (data.customer_address !== undefined) body.customerAddress = data.customer_address;
  if (data.customer_vat_number !== undefined) body.customerVatNumber = data.customer_vat_number;
  if (data.delivery_address !== undefined) body.deliveryAddress = data.delivery_address;
  if (data.delivery_conditions !== undefined) body.deliveryConditions = data.delivery_conditions;
  if (data.order_number !== undefined) body.orderNumber = data.order_number;
  if (data.terms !== undefined) body.terms = data.terms;
  if (data.issue_date !== undefined) body.issueDate = data.issue_date;
  if (data.due_date !== undefined) body.dueDate = data.due_date;
  if (data.status !== undefined) body.status = data.status;
  if (data.subtotal !== undefined) body.subtotal = data.subtotal;
  if (data.tax_rate !== undefined) body.taxRate = data.tax_rate;
  if (data.tax_amount !== undefined) body.taxAmount = data.tax_amount;
  if (data.discount_percent !== undefined) body.discountPercent = data.discount_percent;
  if (data.total !== undefined) body.total = data.total;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class InvoiceService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Invoice[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiInvoiceRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.project_id ?? where.projectId) !== undefined && { projectId: where.project_id ?? where.projectId }),
      ...(where.status !== undefined && { status: where.status }),
    });
    let rows = (response.data ?? []).map(normalizeInvoice);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Invoice;
      rows = [...rows].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return -1 * dir;
        if (bv == null) return 1 * dir;
        return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
      });
    }
    return rows;
  }

  static async findById(id: number): Promise<Invoice | null> {
    try {
      const response = await foroApiClient.get<ApiInvoiceRow>(`${BASE}/${id}`);
      return response.data ? normalizeInvoice(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  /**
   * Create a new invoice (line items go to invoice_items table via InvoiceItemService)
   */
  static async create(data: CreateInvoiceDto): Promise<Invoice> {
    const { items: _items, ...invoiceRow } = data;
    const response = await foroApiClient.post<ApiInvoiceRow>(BASE, toApiBody(invoiceRow));
    return normalizeInvoice(response.data);
  }

  /**
   * Update an invoice (line items are managed separately via InvoiceItemService)
   */
  static async update(id: number, data: Partial<CreateInvoiceDto>): Promise<{ rowCount: number }> {
    const { items: _items, ...invoiceRow } = data;
    const response = await foroApiClient.put<ApiInvoiceRow>(`${BASE}/${id}`, toApiBody(invoiceRow));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }

  static async findByStatus(status: string): Promise<Invoice[]> {
    return this.findAll({
      where: { status },
      orderBy: 'issue_date',
      orderDirection: 'DESC',
    });
  }

  static async count(where?: Record<string, unknown>): Promise<number> {
    const rows = await this.findAll({ where, limit: 5000 });
    return rows.length;
  }
}

export default InvoiceService;
