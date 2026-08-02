/**
 * Item / Stock Service
 * Handles items (products/stock) API calls
 */

import { foroApiClient } from '../backend';
import type { Item, CreateItemDto } from '../types/item';

const BASE = '/api/v1/stock-items';

interface ApiStockItemRow {
  id: number;
  businessId: number | null;
  companyId: number | null;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: string;
  taxRate: string | null;
  quantity: number;
  costPrice: string | null;
  itemType: string;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiStockItemRow): Item {
  return {
    id: row.id,
    business_id: row.businessId ?? undefined,
    name: row.name,
    sku: row.sku ?? undefined,
    description: row.description ?? undefined,
    unit_price: Number(row.unitPrice),
    cost_price: row.costPrice != null ? Number(row.costPrice) : undefined,
    quantity: row.quantity,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    item_type: row.itemType as Item['item_type'],
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateItemDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.name !== undefined) body.name = data.name;
  if (data.sku !== undefined) body.sku = data.sku;
  if (data.description !== undefined) body.description = data.description;
  if (data.unit_price !== undefined) body.unitPrice = data.unit_price;
  if (data.cost_price !== undefined) body.costPrice = data.cost_price;
  if (data.quantity !== undefined) body.quantity = data.quantity;
  if (data.tax_rate !== undefined) body.taxRate = data.tax_rate;
  if (data.item_type !== undefined) body.itemType = data.item_type;
  return body;
}

export class ItemService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit?: number;
    offset?: number;
  }): Promise<Item[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiStockItemRow[]>(BASE, {
      limit: params?.limit ?? 5000,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
    });
    let rows = (response.data ?? []).map(fromApi);
    if (params?.orderBy) {
      const dir = params.orderDirection === 'DESC' ? -1 : 1;
      const key = params.orderBy as keyof Item;
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

  static async findById(id: number): Promise<Item | null> {
    try {
      const response = await foroApiClient.get<ApiStockItemRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateItemDto): Promise<Item> {
    const response = await foroApiClient.post<ApiStockItemRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateItemDto>): Promise<{ rowCount: number }> {
    const response = await foroApiClient.put<ApiStockItemRow>(`${BASE}/${id}`, toApiBody(data));
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

export default ItemService;
