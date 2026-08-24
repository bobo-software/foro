/**
 * Subscription types — business-level plan tracking.
 */

export type SubscriptionTier = 'free' | 'bronze' | 'silver' | 'gold';

export type SubscriptionStatus = 'active' | 'pending' | 'past_due' | 'cancelled';

export interface BusinessSubscription {
  id?: number;
  business_id: number;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider?: string;
  plan_code?: string | null;
  transaction_id?: string | null;
  subscription_token?: string | null;
  amount?: number | null;
  currency?: string;
  current_period_end?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBusinessSubscriptionDto {
  business_id: number;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider?: string;
  plan_code?: string | null;
  transaction_id?: string | null;
  subscription_token?: string | null;
  amount?: number | null;
  currency?: string;
  current_period_end?: string | null;
}
