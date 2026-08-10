/**
 * Company Service
 * Handles all company-related API calls (client businesses, formerly "Customer")
 */

import { foroApiClient } from '../backend';
import type { Company, CreateCompanyDto } from '../types/company';

const BASE = '/api/v1/companies';

interface ApiCompanyRow {
  id: number;
  userId: number | null;
  name: string;
  address: string | null;
  taxId: string | null;
  logoUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  businessId: number | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  contactPerson: string | null;
  businessType: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  industry: string | null;
  website: string | null;
  notes: string | null;
  isOwnerCompany: boolean | null;
  documentTemplate: string | null;
  showLogoOnDocuments: boolean | null;
  taxEnabled: boolean | null;
}

function fromApi(row: ApiCompanyRow): Company {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    is_owner_company: row.isOwnerCompany ?? undefined,
    business_id: row.businessId ?? undefined,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    company_name: row.companyName ?? undefined,
    contact_person: row.contactPerson ?? undefined,
    tax_id: row.taxId ?? undefined,
    business_type: row.businessType ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    vat_number: row.vatNumber ?? undefined,
    industry: row.industry ?? undefined,
    website: row.website ?? undefined,
    notes: row.notes ?? undefined,
    logo_url: row.logoUrl ?? undefined,
    document_template: row.documentTemplate ?? undefined,
    show_logo_on_documents: row.showLogoOnDocuments ?? undefined,
    tax_enabled: row.taxEnabled ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateCompanyDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.user_id !== undefined) body.userId = data.user_id;
  if (data.is_owner_company !== undefined) body.isOwnerCompany = data.is_owner_company;
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.name !== undefined) body.name = data.name;
  if (data.email !== undefined) body.email = data.email;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.address !== undefined) body.address = data.address;
  if (data.company_name !== undefined) body.companyName = data.company_name;
  if (data.contact_person !== undefined) body.contactPerson = data.contact_person;
  if (data.tax_id !== undefined) body.taxId = data.tax_id;
  if (data.business_type !== undefined) body.businessType = data.business_type;
  if (data.registration_number !== undefined) body.registrationNumber = data.registration_number;
  if (data.vat_number !== undefined) body.vatNumber = data.vat_number;
  if (data.industry !== undefined) body.industry = data.industry;
  if (data.website !== undefined) body.website = data.website;
  if (data.notes !== undefined) body.notes = data.notes;
  if (data.logo_url !== undefined) body.logoUrl = data.logo_url;
  if (data.document_template !== undefined) body.documentTemplate = data.document_template;
  if (data.show_logo_on_documents !== undefined) body.showLogoOnDocuments = data.show_logo_on_documents;
  if (data.tax_enabled !== undefined) body.taxEnabled = data.tax_enabled;
  return body;
}

export class CompanyService {
  private static async listUserCompanyLinks(userId: number): Promise<Array<{ company_id: number }>> {
    const response = await foroApiClient.get<Array<{ id: number; userId: number; companyId: number }>>(
      '/api/v1/user-companies',
      { userId, limit: 500 }
    );
    return (response.data ?? []).map((row) => ({ company_id: row.companyId }));
  }

  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Company[]> {
    // Only userId/businessId/isOwnerCompany are server-side filterable; anything
    // else in `where` is applied client-side to preserve the old call sites' behavior.
    const { userId, businessId, isOwnerCompany, ...rest } = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiCompanyRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...(userId !== undefined && { userId }),
      ...(businessId !== undefined && { businessId }),
      ...(isOwnerCompany !== undefined && { isOwnerCompany }),
    });
    let rows = (response.data ?? []).map(fromApi);
    for (const [key, value] of Object.entries(rest)) {
      rows = rows.filter((row) => (row as unknown as Record<string, unknown>)[key] === value);
    }
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Company;
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

  static async findById(id: number): Promise<Company | null> {
    try {
      const response = await foroApiClient.get<ApiCompanyRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateCompanyDto): Promise<Company> {
    const response = await foroApiClient.post<ApiCompanyRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async findOwnerCompanyByUserId(userId: number): Promise<Company | null> {
    const rows = await this.findAll({
      where: { userId, isOwnerCompany: true },
      orderBy: 'id',
      orderDirection: 'ASC',
      limit: 1,
    });
    return rows[0] ?? null;
  }

  static async getOwnerCompaniesForUser(userId: number): Promise<Company[]> {
    return this.findAll({
      where: { userId, isOwnerCompany: true },
      orderBy: 'id',
      orderDirection: 'ASC',
      limit: 50,
    });
  }

  static async getAccessibleCompaniesForUser(userId: number): Promise<Company[]> {
    const [ownerCompanies, userCompanyLinks] = await Promise.all([
      this.getOwnerCompaniesForUser(userId),
      this.listUserCompanyLinks(userId),
    ]);

    const linkedCompanyIds = new Set(userCompanyLinks.map((row) => row.company_id).filter(Boolean));
    const ownerIds = new Set(ownerCompanies.map((company) => company.id).filter(Boolean) as number[]);
    const missingIds = [...linkedCompanyIds].filter((id) => !ownerIds.has(id));

    if (missingIds.length === 0) {
      return ownerCompanies;
    }

    const linkedCompanies = await Promise.all(missingIds.map((id) => this.findById(id)));
    const validLinkedCompanies = linkedCompanies.filter((company): company is Company => Boolean(company));
    return [...ownerCompanies, ...validLinkedCompanies];
  }

  /**
   * Creating a company auto-provisions the caller as `owner` on the server
   * side (see foro-api CompanyRoutes) — no separate membership call needed here.
   */
  static async createOwnerCompany(userId: number, data: CreateCompanyDto): Promise<Company> {
    return this.create({
      ...data,
      user_id: userId,
      is_owner_company: true,
    });
  }

  static async updateOwnerCompany(companyId: number, data: Partial<CreateCompanyDto>): Promise<{ rowCount: number }> {
    return this.update(companyId, data);
  }

  static async update(id: number, data: Partial<CreateCompanyDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiCompanyRow>(`${BASE}/${id}`, toApiBody(data));
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
}

export default CompanyService;
