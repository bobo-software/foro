import { create } from 'zustand';
import SubscriptionService from '../../services/subscriptionService';
import PaymentGatewayService from '../../services/paymentGatewayService';
import { getPricingTier } from '../../config/pricingTiers';
import type { BusinessSubscription, SubscriptionTier } from '../../types/subscription';

/**
 * A subscription only counts as its paid tier while `status === 'active'`.
 * Anything else (no row yet, pending checkout, a lapsed/past-due payment)
 * falls back to Free-tier limits — there is no "blocked" state, only "free".
 */
export function getEffectiveTier(subscription: BusinessSubscription | null): SubscriptionTier {
  return subscription?.status === 'active' ? subscription.tier : 'free';
}

interface SubscriptionState {
  currentSubscription: BusinessSubscription | null;
  loading: boolean;
  error: string | null;
  fetchForBusiness: (businessId: number) => Promise<void>;
  /** Loads the business's subscription, auto-creating an active Free row if none exists yet. */
  ensureSubscription: (businessId: number) => Promise<void>;
  selectFreeTier: (businessId: number) => Promise<void>;
  startPaidCheckout: (
    businessId: number,
    tier: SubscriptionTier,
    customerEmail: string
  ) => Promise<string | null>;
  reconcilePending: () => Promise<void>;
  /** Cancels any active paid plan and reverts the business to Free. Returns false (with `error` set) if the API call fails. */
  cancel: () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  currentSubscription: null,
  loading: false,
  error: null,

  fetchForBusiness: async (businessId: number) => {
    set({ loading: true, error: null });
    try {
      const currentSubscription = await SubscriptionService.findByBusinessId(businessId);
      set({ currentSubscription, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      set({ error: message, loading: false, currentSubscription: null });
    }
  },

  ensureSubscription: async (businessId: number) => {
    set({ loading: true, error: null });
    try {
      let subscription = await SubscriptionService.findByBusinessId(businessId);
      if (!subscription) {
        subscription = await SubscriptionService.create({
          business_id: businessId,
          tier: 'free',
          status: 'active',
          provider: 'paystack',
        });
      }
      set({ currentSubscription: subscription, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      set({ error: message, loading: false });
    }
  },

  selectFreeTier: async (businessId: number) => {
    set({ loading: true, error: null });
    try {
      const existing = await SubscriptionService.findByBusinessId(businessId);
      const payload = { business_id: businessId, tier: 'free' as const, status: 'active' as const, provider: 'paystack' };
      const currentSubscription = existing
        ? await SubscriptionService.update(businessId, payload).then(() => ({ ...existing, ...payload }))
        : await SubscriptionService.create(payload);
      set({ currentSubscription, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select the free plan';
      set({ error: message, loading: false });
    }
  },

  startPaidCheckout: async (businessId: number, tier: SubscriptionTier, customerEmail: string) => {
    set({ loading: true, error: null });
    try {
      const pricingTier = getPricingTier(tier);
      if (!pricingTier.planCode) {
        throw new Error(`No Paystack plan configured for the ${pricingTier.name} tier yet`);
      }

      const origin = window.location.origin;
      const initiated = await PaymentGatewayService.initiatePayment({
        provider_id: pricingTier.providerId,
        plan_code: pricingTier.planCode,
        // The docs say amount/item_name are optional once plan_code is set,
        // but the live API 400s without them — send them explicitly.
        amount: pricingTier.amount,
        item_name: `Foro ${pricingTier.name} Plan`,
        customer_email: customerEmail,
        payment_type: 'subscription',
        metadata: { business_id: businessId, tier },
        return_url: `${origin}/payment/success`,
        cancel_url: `${origin}/payment/cancel`,
      });

      if (!initiated.success || !initiated.paymentUrl) {
        throw new Error(initiated.error || 'Failed to start checkout');
      }

      // Record the pending subscription so the success/cancel pages (and any
      // later SubscriptionGate visit) can find and reconcile this transaction
      // by business_id alone — gateways don't reliably echo our transactionId
      // back on the redirect.
      const existing = await SubscriptionService.findByBusinessId(businessId);
      const payload = {
        business_id: businessId,
        tier,
        status: 'pending' as const,
        provider: 'paystack',
        plan_code: pricingTier.planCode,
        transaction_id: initiated.transactionId,
        amount: pricingTier.amount,
        currency: 'ZAR',
      };
      const currentSubscription = existing
        ? await SubscriptionService.update(businessId, payload).then(() => ({ ...existing, ...payload }))
        : await SubscriptionService.create(payload);

      set({ currentSubscription, loading: false });
      return initiated.paymentUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      set({ error: message, loading: false });
      return null;
    }
  },

  reconcilePending: async () => {
    const { currentSubscription } = get();
    if (!currentSubscription || currentSubscription.status !== 'pending' || !currentSubscription.transaction_id) {
      return;
    }
    try {
      const result = await PaymentGatewayService.getTransactionStatus(currentSubscription.transaction_id);
      if (!result.success) return;

      if (result.data.status === 'complete') {
        await SubscriptionService.update(currentSubscription.business_id, {
          status: 'active',
          subscription_token: result.data.subscription_token ?? null,
        });
        set({
          currentSubscription: {
            ...currentSubscription,
            status: 'active',
            subscription_token: result.data.subscription_token ?? null,
          },
        });
      } else if (result.data.status === 'failed' || result.data.status === 'cancelled') {
        // Falls back to Free-tier limits automatically via getEffectiveTier() —
        // 'past_due' is kept only for the Billing tab's history/messaging.
        await SubscriptionService.update(currentSubscription.business_id, { status: 'past_due' });
        set({ currentSubscription: { ...currentSubscription, status: 'past_due' } });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reconcile subscription';
      set({ error: message });
    }
  },

  cancel: async () => {
    const { currentSubscription } = get();
    if (!currentSubscription) return false;
    set({ loading: true, error: null });
    try {
      if (currentSubscription.transaction_id && currentSubscription.tier !== 'free' && currentSubscription.status === 'active') {
        await PaymentGatewayService.cancelSubscription(currentSubscription.transaction_id);
      }
      const payload = {
        tier: 'free' as const,
        status: 'active' as const,
        plan_code: null,
        transaction_id: null,
        subscription_token: null,
        amount: 0,
      };
      await SubscriptionService.update(currentSubscription.business_id, payload);
      set({
        currentSubscription: { ...currentSubscription, ...payload },
        loading: false,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      set({ error: message, loading: false });
      return false;
    }
  },
}));

export default useSubscriptionStore;
