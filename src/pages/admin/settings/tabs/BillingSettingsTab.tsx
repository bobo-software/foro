import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';
import { useIsBusinessOwner } from '@/hooks/useBusinessRole';
import useAuthStore from '@/stores/data/AuthStore';
import { PRICING_TIERS, getPricingTier } from '@/config/pricingTiers';
import type { SubscriptionTier } from '@/types/subscription';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Payment pending',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  past_due: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function BillingSettingsTab() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription);
  const fetchForBusiness = useSubscriptionStore((s) => s.fetchForBusiness);
  const selectFreeTier = useSubscriptionStore((s) => s.selectFreeTier);
  const startPaidCheckout = useSubscriptionStore((s) => s.startPaidCheckout);
  const cancelSubscription = useSubscriptionStore((s) => s.cancel);

  const businessId = currentBusiness?.id ?? null;
  const { isOwner } = useIsBusinessOwner(businessId);
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    if (businessId != null) void fetchForBusiness(businessId);
  }, [businessId, fetchForBusiness]);

  const handleChangePlan = async (tier: SubscriptionTier) => {
    if (!businessId) return;
    setPendingTier(tier);
    try {
      if (tier === 'free') {
        await selectFreeTier(businessId);
        toast.success('Switched to the Free plan');
        return;
      }
      const email = sessionUser?.email;
      if (!email) {
        toast.error('Your account has no email on file');
        return;
      }
      const paymentUrl = await startPaidCheckout(businessId, tier, email);
      if (!paymentUrl) {
        const reason = useSubscriptionStore.getState().error;
        toast.error(reason || 'Failed to start checkout. Please try again.');
        return;
      }
      window.location.href = paymentUrl;
    } finally {
      setPendingTier(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel your paid plan and switch back to Free? You can upgrade again any time.')) {
      return;
    }
    const cancelled = await cancelSubscription();
    if (!cancelled) {
      const reason = useSubscriptionStore.getState().error;
      toast.error(reason ? `Failed to cancel: ${reason}` : 'Failed to cancel your subscription. Please try again.');
      return;
    }
    toast.success('Switched back to the Free plan');
  };

  if (!isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Only the account owner can manage billing for this business.
        </p>
      </div>
    );
  }

  const currentTier = currentSubscription ? getPricingTier(currentSubscription.tier) : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Current plan</h3>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {currentTier?.name ?? 'No plan selected'}
            </p>
          </div>
          {currentSubscription?.status && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_CLASS[currentSubscription.status] ?? STATUS_CLASS.cancelled
              }`}
            >
              {STATUS_LABEL[currentSubscription.status] ?? currentSubscription.status}
            </span>
          )}
        </div>
        {currentSubscription?.tier !== 'free' && currentSubscription?.status === 'active' && (
          currentSubscription?.subscription_token ? (
            <button
              type="button"
              onClick={handleCancel}
              className="mt-4 text-sm text-red-600 hover:text-red-500 underline"
            >
              Cancel and switch to Free
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Confirming your subscription with the payment provider — cancellation will be available shortly.
            </p>
          )
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Change plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = currentSubscription?.tier === tier.id && currentSubscription?.status === 'active';
            return (
              <div
                key={tier.id}
                className={`rounded-xl border p-4 ${
                  isCurrent
                    ? 'border-indigo-500 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <p className="font-semibold text-slate-900 dark:text-white">{tier.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {tier.price}
                  {tier.period}
                </p>
                <button
                  type="button"
                  disabled={isCurrent || pendingTier !== null}
                  onClick={() => handleChangePlan(tier.id)}
                  className="w-full rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isCurrent ? 'Current plan' : pendingTier === tier.id ? 'Please wait…' : 'Switch'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BillingSettingsTab;
