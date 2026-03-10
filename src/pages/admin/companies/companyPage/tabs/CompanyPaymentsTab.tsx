import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

export function CompanyPaymentsTab({ company, selectedProjectId, payments, docsLoading }: CompanyTabProps) {
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Payments</h2>
        <Link
          to={`/app/payments/create?company_id=${company.id}&company=${encodeURIComponent(company.name)}${projectQuery}`}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          Record payment
        </Link>
      </div>
      {docsLoading ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading payments…
        </div>
      ) : payments.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No payments recorded for this company.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {payments.map((pay) => {
            const methodLabel = PAYMENT_METHODS.find((m) => m.value === pay.payment_method)?.label ?? pay.payment_method ?? '—';
            return (
              <li key={pay.id} className="py-3 first:pt-0 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-800 dark:text-slate-200">
                  {formatDate(pay.date)}
                  <span className="text-slate-500 dark:text-slate-400 ml-1">· {methodLabel}</span>
                  {pay.reference ? ` · ${pay.reference}` : ''}
                </span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(Number(pay.amount), pay.currency)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default CompanyPaymentsTab;
