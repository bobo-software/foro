import { Link } from 'react-router-dom';
import { LuTrendingUp } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { formatCurrency } from '@/utils/currency';
import { isCreditNoteInvoice, invoiceTableRowClassName } from '@/utils/invoiceLedger';
import type { Invoice } from '@/types/invoice';

export interface RecentInvoicesTableProps {
  invoices: Invoice[];
  loading?: boolean;
  error?: string | null;
  title?: string;
  emptyMessage?: string;
}

function formatIssueDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

const invoiceColumns: AppDataTableColumn<Invoice>[] = [
  {
    id: 'document',
    header: 'Document #',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (inv) => (
      <span className="inline-flex items-center gap-1.5 flex-wrap">
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
    id: 'customer',
    header: 'Company',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (inv) => inv.customer_name,
  },
  {
    id: 'issue_date',
    header: 'Date',
    cellClassName: 'text-slate-500 dark:text-slate-400',
    render: (inv) => formatIssueDate(inv.issue_date),
  },
  {
    id: 'status',
    header: 'Status',
    render: (inv) => (
      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
        {inv.status}
      </span>
    ),
  },
  {
    id: 'total',
    header: 'Total',
    align: 'right',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (inv) => formatCurrency(inv.total, inv.currency),
  },
  {
    id: 'actions',
    header: '',
    headerClassName: 'w-14',
    cellClassName: 'w-14',
    render: (inv) => (
      <Link
        to={`/app/invoices/${inv.id}`}
        onClick={(e) => e.stopPropagation()}
        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium no-underline"
      >
        View
      </Link>
    ),
  },
];

/**
 * Compact recent-documents table used on the dashboard and companies hub.
 */
export function RecentInvoicesTable({
  invoices,
  loading = false,
  error = null,
  title = 'Recent invoices and credit notes',
  emptyMessage = 'No invoices yet.',
}: RecentInvoicesTableProps) {
  return (
    <AppDataTable<Invoice>
      title={title}
      titleIcon={<LuTrendingUp />}
      columns={invoiceColumns}
      data={invoices}
      getRowKey={(row, index) => row.id ?? `invoice-${index}`}
      getRowClassName={invoiceTableRowClassName}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
    />
  );
}

export default RecentInvoicesTable;
