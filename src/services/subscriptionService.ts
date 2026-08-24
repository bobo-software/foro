/**
 * Subscription Service
 * Reads business_subscriptions (read-only on the API); all writes go through
 * the /api/v1/payments/* endpoints, which are the table's only writer.
 */

import { foroApiClient } from '../backend';
import type { BusinessSubscription } from '../types/subscription';

const BASE = '/api/v1/business-subscriptions';

interface ApiRow {
  id: number;
  businessId: number;
  tier: string;
  status: string;
  provider: string | null;
  planCode: string | null;
  transactionId: string | null;
  subscriptionCode: string | null;
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
    subscription_code: row.subscriptionCode,
    subscription_token: row.subscriptionToken,
    amount: row.amount != null ? Number(row.amount) : null,
    currency: row.currency ?? undefined,
    current_period_end: row.currentPeriodEnd,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

export class SubscriptionService {
  static async findByBusinessId(businessId: number): Promise<BusinessSubscription | null> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, { businessId, limit: 1 });
    const row = (response.data ?? [])[0];
    return row ? fromApi(row) : null;
  }

  /** Creates or resets the business's row to the Free tier — reached even for a first-time signup, not just downgrades. */
  static async selectFreeTier(businessId: number): Promise<BusinessSubscription> {
    const response = await foroApiClient.post<ApiRow>('/api/v1/payments/select-free-tier', { businessId });
    return fromApi(response.data);
  }

  /** Starts a paid checkout; returns the Paystack authorization URL to redirect the browser to. */
  static async initiateCheckout(
    businessId: number,
    tier: Exclude<BusinessSubscription['tier'], 'free'>,
    customerEmail: string
  ): Promise<{ authorizationUrl: string; reference: string }> {
    const response = await foroApiClient.post<{ authorizationUrl: string; reference: string }>(
      '/api/v1/payments/initiate',
      { businessId, tier, customerEmail }
    );
    return response.data;
  }

  /** Re-verifies a pending transaction with Paystack — a fallback for when the browser returns before the webhook lands. */
  static async verifyTransaction(transactionId: string): Promise<BusinessSubscription | null> {
    const response = await foroApiClient.get<ApiRow | null>(`/api/v1/payments/transaction/${transactionId}`);
    return response.data ? fromApi(response.data) : null;
  }

  static async cancel(businessId: number): Promise<BusinessSubscription> {
    const response = await foroApiClient.post<ApiRow>('/api/v1/payments/subscription/cancel', { businessId });
    return fromApi(response.data);
  }
}

export default SubscriptionService;
