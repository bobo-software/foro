/**
 * Banking Details Service
 * Handles all banking details API calls for users and companies
 *
 * ⚠️ SECURITY GAP: Skaftin encrypted `account_number`/`account_holder`/`branch_code`/
 * `branch_name` at rest (server-side `encrypt`/`decrypt` params on every call below).
 * foro-api has no field-level encryption yet — these fields are stored in **plaintext**
 * via the new API. Do not treat this as resolved; flag before handling real banking
 * data in production. (Consistent with the plaintext account numbers already found
 * in the migrated Skaftin data — see foro-api/docs/migration-log.md.)
 */

import { foroApiClient } from '../backend';
import type { AccountType, BankingDetails, CreateBankingDetailsDto } from '../types/bankingDetails';

const BASE = '/api/v1/banking-details';

interface ApiBankingDetailsRow {
  id: number;
  userId: number | null;
  companyId: number | null;
  label: string | null;
  bankName: string;
  accountHolder: string | null;
  accountNumber: string;
  accountType: string | null;
  branchCode: string | null;
  branchName: string | null;
  swiftCode: string | null;
  iban: string | null;
  isPrimary: boolean | null;
  isActive: boolean | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiBankingDetailsRow): BankingDetails {
  return {
    id: row.id,
    user_id: row.userId ?? undefined,
    company_id: row.companyId ?? undefined,
    label: row.label ?? undefined,
    bank_name: row.bankName,
    account_holder: row.accountHolder ?? undefined,
    account_number: row.accountNumber,
    account_type: (row.accountType as AccountType | null) ?? undefined,
    branch_code: row.branchCode ?? undefined,
    branch_name: row.branchName ?? undefined,
    swift_code: row.swiftCode ?? undefined,
    iban: row.iban ?? undefined,
    is_primary: row.isPrimary ?? undefined,
    is_active: row.isActive ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateBankingDetailsDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.user_id !== undefined) body.userId = data.user_id;
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.label !== undefined) body.label = data.label;
  if (data.bank_name !== undefined) body.bankName = data.bank_name;
  if (data.account_holder !== undefined) body.accountHolder = data.account_holder;
  if (data.account_number !== undefined) body.accountNumber = data.account_number;
  if (data.account_type !== undefined) body.accountType = data.account_type;
  if (data.branch_code !== undefined) body.branchCode = data.branch_code;
  if (data.branch_name !== undefined) body.branchName = data.branch_name;
  if (data.swift_code !== undefined) body.swiftCode = data.swift_code;
  if (data.iban !== undefined) body.iban = data.iban;
  if (data.is_primary !== undefined) body.isPrimary = data.is_primary;
  if (data.is_active !== undefined) body.isActive = data.is_active;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class BankingDetailsService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<BankingDetails[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiBankingDetailsRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...(where.company_id !== undefined && { companyId: where.company_id }),
      ...(where.user_id !== undefined && { userId: where.user_id }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (where.is_primary !== undefined) rows = rows.filter((r) => r.is_primary === where.is_primary);
    if (where.is_active !== undefined) rows = rows.filter((r) => r.is_active === where.is_active);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof BankingDetails;
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

  static async findByCompanyId(companyId: number): Promise<BankingDetails[]> {
    return this.findAll({ where: { company_id: companyId } });
  }

  static async findByUserId(userId: number): Promise<BankingDetails[]> {
    return this.findAll({ where: { user_id: userId } });
  }

  static async findById(id: number): Promise<BankingDetails | null> {
    try {
      const response = await foroApiClient.get<ApiBankingDetailsRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateBankingDetailsDto): Promise<BankingDetails> {
    const response = await foroApiClient.post<ApiBankingDetailsRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateBankingDetailsDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiBankingDetailsRow>(`${BASE}/${id}`, toApiBody(data));
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

  static async setPrimary(id: number, entityType: 'company' | 'user', entityId: number): Promise<void> {
    const whereKey = entityType === 'company' ? 'company_id' : 'user_id';

    const existingPrimary = await this.findAll({ where: { [whereKey]: entityId, is_primary: true } });

    for (const detail of existingPrimary) {
      if (detail.id && detail.id !== id) {
        await this.update(detail.id, { is_primary: false });
      }
    }

    await this.update(id, { is_primary: true });
  }

  static async getPrimary(entityType: 'company' | 'user', entityId: number): Promise<BankingDetails | null> {
    const whereKey = entityType === 'company' ? 'company_id' : 'user_id';
    const details = await this.findAll({ where: { [whereKey]: entityId, is_primary: true } });
    return details[0] || null;
  }

  static async getActive(entityType: 'company' | 'user', entityId: number): Promise<BankingDetails[]> {
    const whereKey = entityType === 'company' ? 'company_id' : 'user_id';
    return this.findAll({ where: { [whereKey]: entityId, is_active: true } });
  }
}

export default BankingDetailsService;
