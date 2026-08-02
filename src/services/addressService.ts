/**
 * Address Service
 * Handles all address-related API calls for users and companies
 */

import { foroApiClient } from '../backend';
import type { Address, AddressType, CreateAddressDto } from '../types/address';

const BASE = '/api/v1/addresses';

interface ApiAddressRow {
  id: number;
  userId: number | null;
  companyId: number | null;
  label: string | null;
  streetAddress: string | null;
  streetAddress2: string | null;
  suburb: string | null;
  town: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postalCode: string | null;
  isPrimary: boolean | null;
  addressType: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiAddressRow): Address {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    company_id: row.companyId ?? undefined,
    label: row.label ?? undefined,
    street_address: row.streetAddress ?? undefined,
    street_address_2: row.streetAddress2 ?? undefined,
    suburb: row.suburb ?? undefined,
    town: row.town ?? undefined,
    city: row.city ?? undefined,
    province: row.province ?? undefined,
    country: row.country ?? undefined,
    postal_code: row.postalCode ?? undefined,
    is_primary: row.isPrimary ?? undefined,
    address_type: (row.addressType as AddressType | null) ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateAddressDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.user_id !== undefined) body.userId = data.user_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.label !== undefined) body.label = data.label;
  if (data.street_address !== undefined) body.streetAddress = data.street_address;
  if (data.street_address_2 !== undefined) body.streetAddress2 = data.street_address_2;
  if (data.suburb !== undefined) body.suburb = data.suburb;
  if (data.town !== undefined) body.town = data.town;
  if (data.city !== undefined) body.city = data.city;
  if (data.province !== undefined) body.province = data.province;
  if (data.country !== undefined) body.country = data.country;
  if (data.postal_code !== undefined) body.postalCode = data.postal_code;
  if (data.is_primary !== undefined) body.isPrimary = data.is_primary;
  if (data.address_type !== undefined) body.addressType = data.address_type;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class AddressService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Address[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiAddressRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...(where.company_id !== undefined && { companyId: where.company_id }),
      ...(where.user_id !== undefined && { userId: where.user_id }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (where.is_primary !== undefined) {
      rows = rows.filter((r) => r.is_primary === where.is_primary);
    }
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Address;
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

  static async findByCompanyId(companyId: number): Promise<Address[]> {
    return this.findAll({ where: { company_id: companyId } });
  }

  static async findByUserId(userId: number): Promise<Address[]> {
    return this.findAll({ where: { user_id: userId } });
  }

  static async findById(id: number): Promise<Address | null> {
    try {
      const response = await foroApiClient.get<ApiAddressRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateAddressDto): Promise<Address> {
    const response = await foroApiClient.post<ApiAddressRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateAddressDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiAddressRow>(`${BASE}/${id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }

  static async delete(id: number): Promise<{ rowCount: number }> {
    await foroApiClient.delete(`${BASE}/${id}`);
    return { rowCount: 1 };
  }

  static async deleteByCompanyId(companyId: number): Promise<{ rowCount: number }> {
    const rows = await this.findByCompanyId(companyId);
    await Promise.all(rows.map((r) => (r.id ? this.delete(r.id) : Promise.resolve())));
    return { rowCount: rows.length };
  }

  static async deleteByUserId(userId: number): Promise<{ rowCount: number }> {
    const rows = await this.findByUserId(userId);
    await Promise.all(rows.map((r) => (r.id ? this.delete(r.id) : Promise.resolve())));
    return { rowCount: rows.length };
  }

  /**
   * Set an address as primary, unsetting any other primary addresses for the same entity
   */
  static async setPrimary(id: number, entityType: 'company' | 'user', entityId: number): Promise<void> {
    const whereKey = entityType === 'company' ? 'company_id' : 'user_id';

    const existingPrimary = await this.findAll({
      where: { [whereKey]: entityId, is_primary: true },
    });

    for (const address of existingPrimary) {
      if (address.id && address.id !== id) {
        await this.update(address.id, { is_primary: false });
      }
    }

    await this.update(id, { is_primary: true });
  }

  /**
   * Get the primary address for an entity
   */
  static async getPrimary(entityType: 'company' | 'user', entityId: number): Promise<Address | null> {
    const whereKey = entityType === 'company' ? 'company_id' : 'user_id';
    const addresses = await this.findAll({
      where: { [whereKey]: entityId, is_primary: true },
    });
    return addresses[0] || null;
  }
}

export default AddressService;
