/**
 * Subscription types — business-level plan tracking + Skaftin Payment API shapes
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

/** Skaftin Payment API — GET /app-api/payments/plans */
export interface PaymentPlan {
  id: number;
  provider_id: number;
  plan_code: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: string;
}

/** Skaftin Payment API — POST /app-api/payments/initiate */
export interface InitiatePaymentRequest {
  provider_id?: number;
  amount?: number;
  item_name?: string;
  item_description?: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  payment_type?: 'once_off' | 'subscription';
  plan_id?: number;
  plan_code?: string;
  subscription_type?: number;
  frequency?: number;
  cycles?: number;
  billing_date?: number;
  metadata?: Record<string, unknown>;
  return_url?: string;
  cancel_url?: string;
  notify_url?: string;
}

export interface InitiatePaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl: string;
  paymentData?: object;
  error?: string;
}

/** Skaftin Payment API — GET /app-api/payments/transaction/{transactionId} */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'complete'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export interface TransactionStatusResponse {
  success: boolean;
  data: {
    transaction_id: string;
    status: TransactionStatus;
    amount: number;
    currency: string;
    item_name: string;
    payment_type: 'once_off' | 'subscription';
    plan_id?: number;
    plan_code?: string;
    subscription_token?: string;
    paid_at?: string;
    created_at: string;
  };
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
