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
        subscription = await SubscriptionService.selectFreeTier(businessId);
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
      const currentSubscription = await SubscriptionService.selectFreeTier(businessId);
      set({ currentSubscription, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select the free plan';
      set({ error: message, loading: false });
    }
  },

  startPaidCheckout: async (businessId: number, tier: SubscriptionTier, customerEmail: string) => {
    if (tier === 'free') return null;
    set({ error: null });
    try {
      const { authorizationUrl } = await SubscriptionService.initiateCheckout(businessId, tier, customerEmail);
      return authorizationUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      set({ error: message });
      return null;
    }
  },

  // Force-refreshes the pending subscription's status against Paystack — a fallback
  // for when the browser returns to /payment/success before the webhook has landed.
  reconcilePending: async () => {
    const { currentSubscription } = get();
    if (!currentSubscription?.transaction_id || currentSubscription.status !== 'pending') return;
    try {
      const subscription = await SubscriptionService.verifyTransaction(currentSubscription.transaction_id);
      if (subscription) set({ currentSubscription: subscription });
    } catch {
      // Swallow — the polling loop in PaymentSuccess.tsx degrades to its timeout state.
    }
  },

  cancel: async () => {
    const { currentSubscription } = get();
    if (!currentSubscription) return false;
    set({ loading: true, error: null });
    try {
      const subscription = await SubscriptionService.cancel(currentSubscription.business_id);
      set({ currentSubscription: subscription, loading: false });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      set({ error: message, loading: false });
      return false;
    }
  },
}));

export default useSubscriptionStore;
