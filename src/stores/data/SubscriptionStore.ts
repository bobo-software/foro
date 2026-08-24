import { create } from 'zustand';
import SubscriptionService from '../../services/subscriptionService';
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

  startPaidCheckout: async (_businessId: number, _tier: SubscriptionTier, _customerEmail: string) => {
    // Paid checkout went through Skaftin's Payment API (Paystack/PayFast proxy),
    // which has been decommissioned. foro-api has no payment-provider
    // integration yet, so paid plans are unavailable until that's built —
    // see docs/02-modules/payments-subscriptions.md.
    set({ error: 'Paid plans are not available right now. Please check back soon.' });
    return null;
  },

  // No payment gateway to reconcile a pending transaction against anymore.
  // Kept as a no-op (rather than removed) so PaymentSuccess.tsx's polling
  // loop still degrades to its "still processing" timeout state instead of
  // erroring outright.
  reconcilePending: async () => {},

  cancel: async () => {
    const { currentSubscription } = get();
    if (!currentSubscription) return false;
    set({ loading: true, error: null });
    try {
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
