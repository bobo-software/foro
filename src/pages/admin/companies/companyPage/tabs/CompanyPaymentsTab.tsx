import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialReactTable, type MRT_ColumnDef, type MRT_Row } from 'material-react-table';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';
import type { Payment } from '@/types/payment';
import PaymentService from '@/services/paymentService';
import MRTThemeProvider from '@/components/providers/MRTThemeProvider';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

export function CompanyPaymentsTab({ company, selectedProjectId, payments, docsLoading, onRefresh }: CompanyTabProps & { onRefresh?: () => void }) {
  const navigate = useNavigate();
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = useCallback(async (row: MRT_Row<Payment>) => {
    const id = row.original.id;
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
  }, [onRefresh]);

  const columns = useMemo<MRT_ColumnDef<Payment>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        Cell: ({ cell }) => formatDate(String(cell.getValue())),
        sortingFn: 'datetime',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        Cell: ({ cell, row }) => formatCurrency(Number(cell.getValue()), row.original.currency),
      },
      {
        accessorKey: 'payment_method',
        header: 'Method',
        Cell: ({ cell }) => {
          const val = String(cell.getValue() ?? '');
          return PAYMENT_METHODS.find((m) => m.value === val)?.label ?? val ?? '—';
        },
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        Cell: ({ cell }) => String(cell.getValue() ?? '—'),
      },
    ],
    []
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Payments ({payments.length})
        </h2>
        <Link
          to={`/app/payments/create?company_id=${company.id}&company=${encodeURIComponent(company.name)}${projectQuery}&from_company=${company.id}`}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          Record payment
        </Link>
      </div>
      {docsLoading ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          Loading payments…
        </div>
      ) : (
        <MRTThemeProvider>
          <MaterialReactTable
            columns={columns}
            data={payments}
            enableTopToolbar={false}
            enableColumnFilters={false}
            enableGlobalFilter={false}
            enableColumnOrdering={false}
            enableColumnResizing={false}
            enableRowActions
            positionActionsColumn="last"
            displayColumnDefOptions={{ 'mrt-row-actions': { header: '' } }}
            renderRowActions={({ row }) => (
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    navigate(
                      `/app/payments/${row.original.id}/edit?from_company=${company.id}`
                    )
                  }
                  className="p-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded"
                  title="Edit"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.original.id}
                  className="p-1 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded disabled:opacity-40"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            )}
            initialState={{
              density: 'compact',
              sorting: [{ id: 'date', desc: true }],
            }}
          />
        </MRTThemeProvider>
      )}
    </div>
  );
}

export default CompanyPaymentsTab;
