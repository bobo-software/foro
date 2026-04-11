import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';
import type { Payment } from '@/types/payment';
import PaymentService from '@/services/paymentService';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

function sortPaymentsByDateDesc(rows: Payment[]): Payment[] {
  return [...rows].sort((a, b) => {
    const da = a.date ?? '';
    const db = b.date ?? '';
    return db.localeCompare(da);
  });
}

export function CompanyPaymentsTab({
  company,
  selectedProjectId,
  payments,
  docsLoading,
  onRefresh,
}: CompanyTabProps & { onRefresh?: () => void }) {
  const navigate = useNavigate();
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedPayments = useMemo(() => sortPaymentsByDateDesc(payments), [payments]);

  const handleDelete = useCallback(
    async (payment: Payment) => {
      const id = payment.id;
      if (!id) return;
      if (!window.confirm('Delete this payment? This cannot be undone.')) return;
      setDeletingId(id);
      try {
        await PaymentService.delete(id);
        onRefresh?.();
      } catch {
        alert('Failed to delete payment');
      } finally {
        setDeletingId(null);
      }
    },
    [onRefresh],
  );

  const columns = useMemo<AppDataTableColumn<Payment>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (p) => formatDate(String(p.date ?? '')),
      },
      {
        id: 'amount',
        header: 'Amount',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (p) => formatCurrency(Number(p.amount), p.currency),
      },
      {
        id: 'payment_method',
        header: 'Method',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (p) => {
          const val = String(p.payment_method ?? '');
          return PAYMENT_METHODS.find((m) => m.value === val)?.label ?? val ?? '—';
        },
      },
      {
        id: 'reference',
        header: 'Reference',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (p) => String(p.reference ?? '—'),
      },
      {
        id: 'actions',
        header: '',
        headerClassName: 'w-24',
        cellClassName: 'w-24',
        render: (p) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() =>
                navigate(`/app/payments/${p.id}/edit?from_company=${company.id}`)
              }
              className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded"
              title="Edit"
            >
              ✎
            </button>
            <button
              type="button"
              onClick={() => handleDelete(p)}
              disabled={deletingId === p.id}
              className="p-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded disabled:opacity-40"
              title="Delete"
            >
              ✕
            </button>
          </div>
        ),
      },
    ],
    [company.id, deletingId, handleDelete, navigate],
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Payments ({payments.length})</h2>
        <Link
          to={`/app/payments/create?company_id=${company.id}&company=${encodeURIComponent(company.name)}${projectQuery}&from_company=${company.id}`}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          Record payment
        </Link>
      </div>

      <AppDataTable<Payment>
        embedded
        columns={columns}
        data={sortedPayments}
        getRowKey={(row, index) => row.id ?? `pay-${index}`}
        loading={docsLoading}
        emptyMessage="No payments recorded for this company yet."
      />
    </div>
  );
}

export default CompanyPaymentsTab;
