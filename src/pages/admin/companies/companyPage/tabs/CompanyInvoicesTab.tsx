import { Link } from 'react-router-dom';
import { LuPlus } from 'react-icons/lu';
import { formatCurrency } from '@/utils/currency';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

export function CompanyInvoicesTab({ company, selectedProjectId, invoices, docsLoading }: CompanyTabProps) {
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Invoices ({invoices.length})
        </h3>
        <Link
          to={`/app/invoices/create?company_id=${company.id}${projectQuery}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors no-underline"
        >
          <LuPlus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {docsLoading ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading invoices…
        </div>
      ) : invoices.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No invoices for this company yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {invoices.map((inv) => (
            <li key={inv.id} className="py-3 first:pt-0">
              <Link
                to={`/app/invoices/${inv.id}`}
                className="flex flex-wrap items-center justify-between gap-2 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 no-underline"
              >
                <span className="font-medium">{inv.invoice_number}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(inv.issue_date)} · {inv.status}
                </span>
                <span className="text-sm font-medium">
                  {formatCurrency(Number(inv.total), inv.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CompanyInvoicesTab;
