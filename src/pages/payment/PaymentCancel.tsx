import { Link } from 'react-router-dom';

export function PaymentCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md text-center space-y-4 bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Payment cancelled</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          You cancelled the checkout. No charge was made — you can pick a plan again whenever you&apos;re ready.
        </p>
        <Link to="/app/settings/billing" className="inline-block text-sm text-indigo-600 hover:text-indigo-500 underline">
          Back to plans
        </Link>
      </div>
    </div>
  );
}

export default PaymentCancel;
