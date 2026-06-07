import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFileDown, LuFileText, LuFilter } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import type { Quotation } from '../../types/quotation';
import { useQuotationStore } from '../../stores/data/QuotationStore';
import { useAutoRefresh, useProjectId } from '../../hooks';
import { formatCurrency } from '../../utils/currency';
import { downloadQuotationPdfById } from '../../utils/quotationPdf';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  declined: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  expired: 'bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
  converted: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

export function QuotationListPage() {
  const navigate = useNavigate();
  const { quotations, loading, error, fetchQuotations } = useQuotationStore();
  const projectId = useProjectId();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchQuotations({ status: filterStatus });
  }, [fetchQuotations, filterStatus]);

  useAutoRefresh(projectId, 'quotations', () => fetchQuotations({ status: filterStatus }));

  const filteredQuotations = useMemo(() => {
    if (!search.trim()) return quotations;
    const q = search.trim().toLowerCase();
    return quotations.filter(
      (quo) =>
        quo.quotation_number?.toLowerCase().includes(q) ||
        quo.customer_name?.toLowerCase().includes(q) ||
        quo.status?.toLowerCase().includes(q),
    );
  }, [quotations, search]);

  const handleExportPdf = useCallback(async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await downloadQuotationPdfById(id);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to download PDF');
    }
  }, []);

  const columns = useMemo<AppDataTableColumn<Quotation>[]>(
    () => [
      {
        id: 'quotation_number',
        header: 'Quotation #',
        cellClassName: 'font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap',
        render: (row) => row.quotation_number,
      },
      {
        id: 'customer_name',
        header: 'Company',
        cellClassName: 'text-slate-800 dark:text-slate-100 font-medium',
        render: (row) => row.customer_name,
      },
      {
        id: 'issue_date',
        header: 'Issue Date',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => formatDate(row.issue_date),
      },
      {
        id: 'valid_until',
        header: 'Valid Until',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => (row.valid_until ? formatDate(row.valid_until) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap',
        render: (row) => formatCurrency(Number(row.total), row.currency),
      },
      {
        id: 'pdf',
        header: '',
        align: 'right',
        cellClassName: 'w-8',
        render: (row) =>
          row.id != null ? (
            <button
              type="button"
              onClick={(e) => handleExportPdf(e, row.id!)}
              className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Download PDF"
              aria-label="Download PDF"
            >
              <LuFileDown size={14} />
            </button>
          ) : null,
      },
    ],
    [handleExportPdf],
  );

  if (loading) {
    return (
      <div className="space-y-2">
        <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Quotations</h1>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Loading quotations…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">
          <LuFileText className="inline mr-1.5 mb-0.5 text-indigo-500" size={14} />
          Quotations
        </h1>
        <Link
          to="/app/quotations/create"
          className="shrink-0 rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white no-underline hover:bg-indigo-500"
        >
          + New Quotation
        </Link>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
        <div className="relative ml-auto">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={13} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 pl-7 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            aria-label="Search quotations"
          />
        </div>
      </div>

      <AppDataTable<Quotation>
        columns={columns}
        data={filteredQuotations}
        getRowKey={(row, i) => row.id ?? `quo-${i}`}
        onRowClick={(row) => { if (row.id != null) navigate(`/app/quotations/${row.id}`); }}
        error={error}
        emptyMessage="No quotations found."
        pageSize={20}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}
