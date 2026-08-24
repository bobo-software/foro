/**
 * Payment Service
 * Handles payment CRUD (payments table)
 */

import { foroApiClient } from '../backend';
import type { Payment, CreatePaymentDto } from '../types/payment';

const BASE = '/api/v1/payments';

interface ApiPaymentRow {
  id: number;
  companyId: number | null;
  customerName: string;
  amount: string;
  currency: string;
  date: string;
  reference: string | null;
  invoiceId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  paymentMethod: string | null;
  businessId: number | null;
  projectId: number | null;
}

function normalizePayment(row: ApiPaymentRow): Payment {
  return {
    id: row.id,
    business_id: row.businessId,
    company_id: row.companyId,
    project_id: row.projectId,
    customer_name: row.customerName,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    date: row.date,
    payment_method: (row.paymentMethod as Payment['payment_method']) ?? undefined,
    reference: row.reference ?? undefined,
    invoice_id: row.invoiceId,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreatePaymentDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.project_id !== undefined) body.projectId = data.project_id;
  if (data.customer_name !== undefined) body.customerName = data.customer_name;
  if (data.amount !== undefined) body.amount = data.amount;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.date !== undefined) body.date = data.date;
  if (data.payment_method !== undefined) body.paymentMethod = data.payment_method;
  if (data.reference !== undefined) body.reference = data.reference;
  if (data.invoice_id !== undefined) body.invoiceId = data.invoice_id;
  return body;
}

export class PaymentService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiPaymentRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.invoice_id ?? where.invoiceId) !== undefined && { invoiceId: where.invoice_id ?? where.invoiceId }),
      ...((where.project_id ?? where.projectId) !== undefined && { projectId: where.project_id ?? where.projectId }),
    });
    let rows = (response.data ?? []).map(normalizePayment);
    if (where.customer_name !== undefined) {
      rows = rows.filter((r) => r.customer_name === where.customer_name);
    }
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Payment;
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

  static async findById(id: number): Promise<Payment | null> {
    try {
      const response = await foroApiClient.get<ApiPaymentRow>(`${BASE}/${id}`);
      return response.data ? normalizePayment(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async findByCompanyId(companyId: number, options?: { projectId?: number }): Promise<Payment[]> {
    const where: Record<string, unknown> = { company_id: companyId };
    if (options?.projectId != null) where.project_id = options.projectId;
    return this.findAll({ where, orderBy: 'date', orderDirection: 'DESC' });
  }

  static async create(data: CreatePaymentDto): Promise<Payment> {
    const response = await foroApiClient.post<ApiPaymentRow>(BASE, toApiBody(data));
    return normalizePayment(response.data);
  }

  static async update(id: number, data: Partial<CreatePaymentDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiPaymentRow>(`${BASE}/${id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }
}

export default PaymentService;
