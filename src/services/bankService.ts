/**
 * Bank reference data service
 */

import { foroApiClient } from '../backend';
import type { Bank } from '../types/bank';

const BASE = '/api/v1/banks';

interface ApiBankRow {
  id: number;
  externalId: number;
  name: string;
  slug: string;
  code: string;
  longcode: string | null;
  gateway: string | null;
  payWithBank: boolean;
  supportsTransfer: boolean;
  availableForDirectDebit: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string | null;
  isDeleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiBankRow): Bank {
  return {
    id: row.id,
    external_id: row.externalId,
    name: row.name,
    slug: row.slug,
    code: row.code,
    longcode: row.longcode,
    gateway: row.gateway,
    pay_with_bank: row.payWithBank,
    supports_transfer: row.supportsTransfer,
    available_for_direct_debit: row.availableForDirectDebit,
    active: row.active,
    country: row.country,
    currency: row.currency,
    type: row.type,
    is_deleted: row.isDeleted,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt,
  };
}

export class BankService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Bank[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiBankRow[]>(BASE, {
      limit: params?.limit ?? 500,
      offset: params?.offset ?? 0,
      ...(where.active !== undefined && { active: where.active }),
      ...(where.country !== undefined && { country: where.country }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (where.is_deleted !== undefined) rows = rows.filter((r) => r.is_deleted === where.is_deleted);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Bank;
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

  static async findActive(): Promise<Bank[]> {
    const rows = await BankService.findAll({ where: { active: true, is_deleted: false } });
    return rows.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export default BankService;
