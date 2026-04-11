import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuPlus } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { formatCurrency } from '@/utils/currency';
import type { Quotation } from '@/types/quotation';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

function sortQuotationsByIssueDateDesc(rows: Quotation[]): Quotation[] {
  return [...rows].sort((a, b) => {
    const da = a.issue_date ?? '';
    const db = b.issue_date ?? '';
    return db.localeCompare(da);
  });
}

export function CompanyQuotationsTab({ company, selectedProjectId, quotations, docsLoading }: CompanyTabProps) {
  const navigate = useNavigate();
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';

  const sortedQuotations = useMemo(() => sortQuotationsByIssueDateDesc(quotations), [quotations]);

  const columns = useMemo<AppDataTableColumn<Quotation>[]>(
    () => [
      {
        id: 'quotation_number',
        header: 'Quote No.',
        cellClassName: 'text-slate-800 dark:text-slate-100',
        render: (q) => String(q.quotation_number ?? '—'),
      },
      {
        id: 'issue_date',
        header: 'Date',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (q) => (q.issue_date ? formatDate(q.issue_date) : '—'),
      },
      {
        id: 'valid_until',
        header: 'Valid Until',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (q) => (q.valid_until ? formatDate(q.valid_until) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (q) => {
          const val = String(q.status ?? '—');
          return val.charAt(0).toUpperCase() + val.slice(1);
        },
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (q) => formatCurrency(Number(q.total), q.currency),
      },
    ],
    [],
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Quotations ({quotations.length})
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            All price quotations issued to {company.name}
          </p>
        </div>
        <Link
          to={`/app/quotations/create?company_id=${company.id}${projectQuery}&from_company=${company.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors no-underline"
        >
          <LuPlus className="w-4 h-4" />
          New Quotation
        </Link>
      </div>

      <AppDataTable<Quotation>
        embedded
        columns={columns}
        data={sortedQuotations}
        getRowKey={(row, index) => row.id ?? `q-${index}`}
        onRowClick={(q) => {
          if (q.id != null) navigate(`/app/quotations/${q.id}?from_company=${company.id}`);
        }}
        loading={docsLoading}
        emptyMessage="No quotations for this company yet."
      />
    </div>
  );
}

export default CompanyQuotationsTab;
