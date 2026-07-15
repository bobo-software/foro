import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 5000;

type ViewState = 'checking' | 'active' | 'failed' | 'timeout';

export function PaymentSuccess() {
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const fetchForBusiness = useSubscriptionStore((s) => s.fetchForBusiness);
  const reconcilePending = useSubscriptionStore((s) => s.reconcilePending);

  const [view, setView] = useState<ViewState>('checking');
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (sessionUser?.id != null) {
      void fetchUserBusinesses(Number(sessionUser.id));
    }
  }, [sessionUser?.id, fetchUserBusinesses]);

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (businessId == null) return;

    let cancelled = false;

    const poll = async () => {
      await fetchForBusiness(businessId);
      const status = useSubscriptionStore.getState().currentSubscription?.status;

      if (cancelled) return;

      if (status === 'active') {
        setView('active');
        return;
      }
      if (status === 'past_due') {
        setView('failed');
        return;
      }

      await reconcilePending();
      const nextStatus = useSubscriptionStore.getState().currentSubscription?.status;
      if (cancelled) return;

      if (nextStatus === 'active') {
        setView('active');
        return;
      }
      if (nextStatus === 'past_due') {
        setView('failed');
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setView('timeout');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id, fetchForBusiness, reconcilePending]);

  useEffect(() => {
    if (view === 'active') {
      const timer = setTimeout(() => navigate('/app/dashboard', { replace: true }), 1500);
      return () => clearTimeout(timer);
    }
  }, [view, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md text-center space-y-4 bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        {view === 'checking' && (
          <>
            <div className="mx-auto animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Confirming your payment…</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This usually takes a few seconds. Please don&apos;t close this page.
            </p>
          </>
        )}

        {view === 'active' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Payment successful</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your subscription is active. Redirecting you to your dashboard…
            </p>
          </>
        )}

        {view === 'failed' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Payment failed</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We couldn&apos;t confirm your payment. Please try again.
            </p>
            <Link to="/app/settings/billing" className="inline-block text-sm text-indigo-600 hover:text-indigo-500 underline">
              Back to plans
            </Link>
          </>
        )}

        {view === 'timeout' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Still processing</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your payment is taking longer than expected to confirm. We&apos;ll update your plan automatically
              once it clears — check back shortly.
            </p>
            <Link to="/app/dashboard" className="inline-block text-sm text-indigo-600 hover:text-indigo-500 underline">
              Continue
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccess;
