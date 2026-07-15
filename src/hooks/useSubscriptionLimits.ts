import { useSubscriptionStore, getEffectiveTier } from '@/stores/data/SubscriptionStore';
import { getPricingTier, type PricingTierLimits } from '@/config/pricingTiers';
import type { SubscriptionTier } from '@/types/subscription';

export interface SubscriptionLimits {
  tier: SubscriptionTier;
  limits: PricingTierLimits;
}

/**
 * The active business's effective tier and its usage caps (companies, team
 * members). "Effective" falls back to Free whenever the subscription isn't
 * `active` (no row yet, pending checkout, lapsed payment) — see
 * getEffectiveTier() in SubscriptionStore.
 */
export function useSubscriptionLimits(): SubscriptionLimits {
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription);
  const tier = getEffectiveTier(currentSubscription);
  return { tier, limits: getPricingTier(tier).limits };
}

export default useSubscriptionLimits;
