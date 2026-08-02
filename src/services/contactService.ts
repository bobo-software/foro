/**
 * Contact Service
 * Handles all contact-related API calls (people at client companies)
 */

import { foroApiClient } from '../backend';
import type { Contact, CreateContactDto } from '../types/contact';

const BASE = '/api/v1/contacts';

interface ApiContactRow {
  id: number;
  companyId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  role: string | null;
  isPrimary: boolean | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiContactRow): Contact {
  return {
    id: row.id,
    company_id: row.companyId ?? undefined,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    department: row.department ?? undefined,
    role: row.role ?? undefined,
    is_primary: row.isPrimary ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateContactDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.name !== undefined) body.name = data.name;
  if (data.email !== undefined) body.email = data.email;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.department !== undefined) body.department = data.department;
  if (data.role !== undefined) body.role = data.role;
  if (data.is_primary !== undefined) body.isPrimary = data.is_primary;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class ContactService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Contact[]> {
    const companyId = (params?.where as Record<string, unknown> | undefined)?.company_id;
    const response = await foroApiClient.get<ApiContactRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...(companyId !== undefined && { companyId }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Contact;
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

  static async findByCompanyId(companyId: number): Promise<Contact[]> {
    return this.findAll({ where: { company_id: companyId } });
  }

  static async findById(id: number): Promise<Contact | null> {
    try {
      const response = await foroApiClient.get<ApiContactRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateContactDto): Promise<Contact> {
    const response = await foroApiClient.post<ApiContactRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateContactDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiContactRow>(`${BASE}/${id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }

  static async deleteByCompanyId(companyId: number): Promise<{ rowCount: number }> {
    const contacts = await this.findByCompanyId(companyId);
    await Promise.all(contacts.map((c) => (c.id ? this.delete(c.id) : Promise.resolve())));
    return { rowCount: contacts.length };
  }

  static async setPrimary(id: number, companyId: number): Promise<void> {
    const existingPrimary = await this.findAll({ where: { company_id: companyId, is_primary: true } });

    for (const contact of existingPrimary) {
      if (contact.id && contact.id !== id) {
        await this.update(contact.id, { is_primary: false });
      }
    }

    await this.update(id, { is_primary: true });
  }
}

export default ContactService;
