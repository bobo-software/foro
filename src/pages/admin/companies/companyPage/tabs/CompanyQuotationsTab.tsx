import { Link } from 'react-router-dom';
import { LuPlus } from 'react-icons/lu';
import { formatCurrency } from '@/utils/currency';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

export function CompanyQuotationsTab({ company, selectedProjectId, quotations, docsLoading }: CompanyTabProps) {
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Quotations ({quotations.length})
        </h3>
        <Link
          to={`/app/quotations/create?company_id=${company.id}${projectQuery}&from_company=${company.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors no-underline"
        >
          <LuPlus className="w-4 h-4" />
          New Quotation
        </Link>
      </div>

      {docsLoading ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading quotations…
        </div>
      ) : quotations.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          No quotations for this company yet. Create one to get started.
        </p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {quotations.map((q) => (
            <li key={q.id} className="py-3 first:pt-0">
              <Link
                to={q.id != null ? `/app/quotations/${q.id}?from_company=${company.id}` : '#'}
                className="block focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400">
                  <span className="font-medium">
                    {q.quotation_number ? `Quote ${q.quotation_number}` : `Quotation #${q.id}`}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {q.issue_date ? formatDate(q.issue_date) : '—'} · {q.status ?? '—'}
                  </span>
                  {q.total != null && (
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(q.total), q.currency)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CompanyQuotationsTab;
