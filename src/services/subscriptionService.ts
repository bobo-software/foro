/**
 * Subscription Service
 * CRUD for the business_subscriptions table via Skaftin app-api
 */

import { skaftinClient } from '../backend';
import type { BusinessSubscription, CreateBusinessSubscriptionDto } from '../types/subscription';

const TABLE_NAME = 'business_subscriptions';

function normalizeRows<T>(response: unknown): T[] {
  const r = response as Record<string, unknown>;
  if (Array.isArray(r?.data)) return r.data as T[];
  if (Array.isArray(r?.rows)) return r.rows as T[];
  if (Array.isArray(r)) return r as T[];
  return [];
}

function normalizeSubscription(raw: Record<string, unknown>): BusinessSubscription {
  return {
    ...raw,
    id: raw.id != null ? Number(raw.id) : undefined,
    business_id: Number(raw.business_id),
    amount: raw.amount != null ? Number(raw.amount) : null,
  } as BusinessSubscription;
}

export class SubscriptionService {
  static async findByBusinessId(businessId: number): Promise<BusinessSubscription | null> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/select`,
      { where: { business_id: businessId }, limit: 1, offset: 0 }
    );
    const rows = normalizeRows<Record<string, unknown>>(response);
    const s = rows[0] ?? null;
    return s ? normalizeSubscription(s) : null;
  }

  static async create(data: CreateBusinessSubscriptionDto): Promise<BusinessSubscription> {
    const response = await skaftinClient.post(
      `/app-api/database/tables/${TABLE_NAME}/insert`,
      { data }
    );
    const r = response as unknown as Record<string, unknown>;
    const inserted = (Array.isArray(r?.data) ? r?.data?.[0] : r?.data) ?? r;
    return normalizeSubscription(inserted as Record<string, unknown>);
  }

  static async update(
    businessId: number,
    data: Partial<CreateBusinessSubscriptionDto>
  ): Promise<{ rowCount: number }> {
    const response = await skaftinClient.put(
      `/app-api/database/tables/${TABLE_NAME}/update`,
      { where: { business_id: businessId }, data }
    );
    const r = response as unknown as Record<string, unknown>;
    return { rowCount: (r?.rowCount as number) ?? 0 };
  }
}

export default SubscriptionService;
