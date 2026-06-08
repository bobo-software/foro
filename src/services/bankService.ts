/**
 * Bank reference data service
 */

import { skaftinClient } from '../backend';
import type { Bank } from '../types/bank';

const TABLE_NAME = 'banks';

export class BankService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Bank[]> {
    const response = await skaftinClient.post<{ rows: Bank[]; rowCount: number } | Bank[]>(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      {
        limit: params?.limit ?? 500,
        offset: params?.offset ?? 0,
        ...(params?.where && { where: params.where }),
        ...(params?.orderBy && { orderBy: params.orderBy }),
        ...(params?.orderDirection && { orderDirection: params.orderDirection }),
      }
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    return data?.rows || [];
  }

  static async findActive(): Promise<Bank[]> {
    return BankService.findAll({
      where: { active: true, is_deleted: false },
      orderBy: 'name',
      orderDirection: 'ASC',
    });
  }
}

export default BankService;
