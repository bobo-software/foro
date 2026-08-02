/**
 * Quotation Service
 * Handles quotation CRUD; line items are in quotation_lines (QuotationLineService)
 */

import { foroApiClient } from '../backend';
import type { Quotation, CreateQuotationDto } from '../types/quotation';
import InvoiceService from './invoiceService';
import { computeNextDocumentNumber } from '../utils/documentNumber';

const BASE = '/api/v1/quotations';

interface ApiQuotationRow {
  id: number;
  companyId: number | null;
  quotationNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerAddress: string | null;
  issueDate: string;
  validUntil: string | null;
  status: string;
  subtotal: string;
  taxAmount: string | null;
  total: string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  currency: string | null;
  convertedInvoiceId: number | null;
  taxRate: string | null;
  businessId: number | null;
  customerVatNumber: string | null;
  deliveryAddress: string | null;
  deliveryConditions: string | null;
  orderNumber: string | null;
  terms: string | null;
  projectId: number | null;
  discountPercent: string | null;
}

function normalizeQuotation(row: ApiQuotationRow): Quotation {
  return {
    id: row.id,
    business_id: row.businessId,
    company_id: row.companyId,
    project_id: row.projectId,
    quotation_number: row.quotationNumber,
    customer_name: row.customerName,
    customer_email: row.customerEmail ?? undefined,
    customer_address: row.customerAddress ?? undefined,
    customer_vat_number: row.customerVatNumber ?? undefined,
    delivery_address: row.deliveryAddress ?? undefined,
    delivery_conditions: row.deliveryConditions ?? undefined,
    order_number: row.orderNumber ?? undefined,
    terms: row.terms ?? undefined,
    issue_date: row.issueDate,
    valid_until: row.validUntil ?? undefined,
    status: (row.status as Quotation['status']) ?? 'draft',
    subtotal: Number(row.subtotal) || 0,
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    tax_amount: row.taxAmount != null ? Number(row.taxAmount) : undefined,
    total: Number(row.total) || 0,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
    converted_invoice_id: row.convertedInvoiceId ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateQuotationDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.project_id !== undefined) body.projectId = data.project_id;
  if (data.quotation_number !== undefined) body.quotationNumber = data.quotation_number;
  if (data.customer_name !== undefined) body.customerName = data.customer_name;
  if (data.customer_email !== undefined) body.customerEmail = data.customer_email;
  if (data.customer_address !== undefined) body.customerAddress = data.customer_address;
  if (data.customer_vat_number !== undefined) body.customerVatNumber = data.customer_vat_number;
  if (data.delivery_address !== undefined) body.deliveryAddress = data.delivery_address;
  if (data.delivery_conditions !== undefined) body.deliveryConditions = data.delivery_conditions;
  if (data.order_number !== undefined) body.orderNumber = data.order_number;
  if (data.terms !== undefined) body.terms = data.terms;
  if (data.issue_date !== undefined) body.issueDate = data.issue_date;
  if (data.valid_until !== undefined) body.validUntil = data.valid_until;
  if (data.status !== undefined) body.status = data.status;
  if (data.subtotal !== undefined) body.subtotal = data.subtotal;
  if (data.discount_percent !== undefined) body.discountPercent = data.discount_percent;
  if (data.tax_rate !== undefined) body.taxRate = data.tax_rate;
  if (data.tax_amount !== undefined) body.taxAmount = data.tax_amount;
  if (data.total !== undefined) body.total = data.total;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.notes !== undefined) body.notes = data.notes;
  if (data.converted_invoice_id !== undefined) body.convertedInvoiceId = data.converted_invoice_id;
  return body;
}

export class QuotationService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Quotation[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    // `converted_invoice_id` is not a server-side filter; applied client-side below.
    const response = await foroApiClient.get<ApiQuotationRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.project_id ?? where.projectId) !== undefined && { projectId: where.project_id ?? where.projectId }),
      ...(where.status !== undefined && { status: where.status }),
    });
    let rows = (response.data ?? []).map(normalizeQuotation);
    if ((where.converted_invoice_id ?? where.convertedInvoiceId) !== undefined) {
      const want = where.converted_invoice_id ?? where.convertedInvoiceId;
      rows = rows.filter((r) => r.converted_invoice_id === want);
    }
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Quotation;
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

  static async findById(id: number): Promise<Quotation | null> {
    try {
      const response = await foroApiClient.get<ApiQuotationRow>(`${BASE}/${id}`);
      return response.data ? normalizeQuotation(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateQuotationDto): Promise<Quotation> {
    const { items: _items, ...row } = data;
    const response = await foroApiClient.post<ApiQuotationRow>(BASE, toApiBody(row));
    return normalizeQuotation(response.data);
  }

  static async update(id: number, data: Partial<CreateQuotationDto>): Promise<{ rowCount: number }> {
    const { items: _items, ...row } = data;
    const response = await foroApiClient.put<ApiQuotationRow>(`${BASE}/${id}`, toApiBody(row));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }

  static async count(where?: Record<string, unknown>): Promise<number> {
    const rows = await this.findAll({ where, limit: 5000 });
    return rows.length;
  }

  /**
   * If converted_invoice_id points at a missing invoice, clear the link and set status to accepted
   * so the quote can be edited or converted again.
   */
  static async repairStaleConversionLink(quotationId: number, quo: Quotation): Promise<Quotation> {
    if (quo.converted_invoice_id == null) return quo;
    const inv = await InvoiceService.findById(quo.converted_invoice_id);
    if (inv != null) return quo;
    await this.update(quotationId, { status: 'accepted', converted_invoice_id: null });
    return { ...quo, status: 'accepted', converted_invoice_id: undefined };
  }

  /**
   * When an invoice created from a quotation is deleted, clear the link and allow converting again.
   */
  static async clearConversionForDeletedInvoice(invoiceId: number): Promise<void> {
    const linked = await this.findAll({
      where: { converted_invoice_id: invoiceId },
      limit: 20,
      offset: 0,
    });
    for (const q of linked) {
      if (q.id == null) continue;
      await this.update(q.id, {
        status: 'accepted',
        converted_invoice_id: null,
      });
    }
  }

  static async getNextNumber(): Promise<string> {
    const response = await foroApiClient.get<ApiQuotationRow[]>(BASE, { limit: 5000 });
    const rows = response.data ?? [];
    return computeNextDocumentNumber(rows.map((r) => String(r.quotationNumber ?? '')));
  }
}

export default QuotationService;
