import { useEffect, useRef } from 'react';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

/**
 * Ensures the active business has a `business_subscriptions` row, defaulting
 * every business to an active Free plan the first time it's seen — new
 * businesses and ones created before this feature shipped alike, so no
 * separate backfill/migration job is needed. This does not block rendering:
 * access is never denied here, only capped (see useSubscriptionLimits) —
 * upgrading happens any time from Settings → Billing.
 */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const ensureSubscription = useSubscriptionStore((s) => s.ensureSubscription);
  const reconcilePending = useSubscriptionStore((s) => s.reconcilePending);

  const businessId = currentBusiness?.id ?? null;
  const ensuredForBusinessId = useRef<number | null>(null);

  useEffect(() => {
    if (sessionUser?.id != null) {
      void fetchUserBusinesses(Number(sessionUser.id));
    }
  }, [sessionUser?.id, fetchUserBusinesses]);

  useEffect(() => {
    if (businessId == null || ensuredForBusinessId.current === businessId) return;
    ensuredForBusinessId.current = businessId;
    void ensureSubscription(businessId).then(() => reconcilePending());
  }, [businessId, ensureSubscription, reconcilePending]);

  return <>{children}</>;
}

export default SubscriptionGate;
