import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFilter } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useAutoRefresh, useProjectId } from '../../hooks';
import type { Invoice } from '../../types/invoice';
import { formatCurrency } from '../../utils/currency';
import { isCreditNoteInvoice, invoiceTableRowClassName } from '../../utils/invoiceLedger';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  accepted: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  overdue: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  cancelled: 'bg-slate-50 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_CLASSES[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

interface InvoiceListProps {
  documentKind?: 'invoice' | 'credit_note';
}

export function InvoiceList({ documentKind }: InvoiceListProps) {
  const navigate = useNavigate();
  const { invoices, loading, error, fetchInvoices } = useInvoiceStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const projectId = useProjectId();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInvoices({ status: filterStatus });
  }, [fetchInvoices, filterStatus, businessId]);

  useAutoRefresh(projectId, 'invoices', () => fetchInvoices({ status: filterStatus }));

  const filteredInvoices = useMemo(() => {
    let result = invoices;

    // Filter by document kind
    if (documentKind === 'invoice') {
      result = result.filter((inv) => !isCreditNoteInvoice(inv));
    } else if (documentKind === 'credit_note') {
      result = result.filter((inv) => isCreditNoteInvoice(inv));
    }

    if (!search.trim()) return result;
    const q = search.trim().toLowerCase();
    return result.filter(
      (inv) =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.status?.toLowerCase().includes(q),
    );
  }, [invoices, documentKind, search]);

  const handleExportClick = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    navigate(`/app/invoices/${id}`);
  }, [navigate]);

  const columns = useMemo<AppDataTableColumn<Invoice>[]>(() => {
    const cols: AppDataTableColumn<Invoice>[] = [
      {
        id: 'invoice_number',
        header: 'Document #',
        cellClassName: 'font-mono text-slate-700 dark:text-slate-200 whitespace-nowrap',
        render: (inv) => (
          <span className="inline-flex items-center gap-1.5">
            {isCreditNoteInvoice(inv) && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
                CN
              </span>
            )}
            {inv.invoice_number}
          </span>
        ),
      },
      {
        id: 'customer_name',
        header: 'Company',
        cellClassName: 'text-slate-800 dark:text-slate-100',
        render: (inv) => inv.customer_name,
      },
      {
        id: 'issue_date',
        header: 'Issue Date',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (inv) => formatDate(inv.issue_date),
      },
      {
        id: 'due_date',
        header: 'Due Date',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (inv) => (inv.due_date ? formatDate(inv.due_date) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (inv) => <StatusBadge status={inv.status} />,
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'tabular-nums font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap',
        render: (inv) => formatCurrency(Number(inv.total), inv.currency),
      },
    ];
    return cols;
  }, []);

  const statusOptions =
    documentKind === 'credit_note'
      ? ['all', 'draft', 'accepted', 'cancelled']
      : ['all', 'draft', 'sent', 'accepted', 'paid', 'overdue', 'cancelled'];

  return (
    <div className="space-y-2">
      {/* Filters row */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400"
        >
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
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
            aria-label="Search invoices"
          />
        </div>
      </div>

      <AppDataTable<Invoice>
        columns={columns}
        data={filteredInvoices}
        getRowKey={(row, i) => row.id ?? `inv-${i}`}
        getRowClassName={invoiceTableRowClassName}
        onRowClick={(row) => { if (row.id != null) navigate(`/app/invoices/${row.id}`); }}
        loading={loading}
        error={error}
        emptyMessage={documentKind === 'credit_note' ? 'No credit notes found.' : 'No invoices found.'}
        pageSize={20}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}

export default InvoiceList;
