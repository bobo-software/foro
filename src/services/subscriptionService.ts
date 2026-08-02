/**
 * Subscription Service
 * CRUD for the business_subscriptions table
 */

import { foroApiClient } from '../backend';
import type { BusinessSubscription, CreateBusinessSubscriptionDto } from '../types/subscription';

const BASE = '/api/v1/business-subscriptions';

interface ApiRow {
  id: number;
  businessId: number;
  tier: string;
  status: string;
  provider: string | null;
  planCode: string | null;
  transactionId: string | null;
  subscriptionToken: string | null;
  amount: string | null;
  currency: string | null;
  currentPeriodEnd: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): BusinessSubscription {
  return {
    id: row.id,
    business_id: row.businessId,
    tier: row.tier as BusinessSubscription['tier'],
    status: row.status as BusinessSubscription['status'],
    provider: row.provider ?? undefined,
    plan_code: row.planCode,
    transaction_id: row.transactionId,
    subscription_token: row.subscriptionToken,
    amount: row.amount != null ? Number(row.amount) : null,
    currency: row.currency ?? undefined,
    current_period_end: row.currentPeriodEnd,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateBusinessSubscriptionDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.tier !== undefined) body.tier = data.tier;
  if (data.status !== undefined) body.status = data.status;
  if (data.provider !== undefined) body.provider = data.provider;
  if (data.plan_code !== undefined) body.planCode = data.plan_code;
  if (data.transaction_id !== undefined) body.transactionId = data.transaction_id;
  if (data.subscription_token !== undefined) body.subscriptionToken = data.subscription_token;
  if (data.amount !== undefined) body.amount = data.amount;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.current_period_end !== undefined) body.currentPeriodEnd = data.current_period_end;
  return body;
}

export class SubscriptionService {
  static async findByBusinessId(businessId: number): Promise<BusinessSubscription | null> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, { businessId, limit: 1 });
    const row = (response.data ?? [])[0];
    return row ? fromApi(row) : null;
  }

  static async create(data: CreateBusinessSubscriptionDto): Promise<BusinessSubscription> {
    const response = await foroApiClient.post<ApiRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(
    businessId: number,
    data: Partial<CreateBusinessSubscriptionDto>
  ): Promise<{ rowCount: number }> {
    const existing = await this.findByBusinessId(businessId);
    if (!existing?.id) return { rowCount: 0 };
    const response = await foroApiClient.put<ApiRow>(`${BASE}/${existing.id}`, toApiBody(data));
    return { rowCount: response.data ? 1 : 0 };
  }
}

export default SubscriptionService;
