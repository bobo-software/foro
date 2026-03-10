import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { LuFilter } from 'react-icons/lu';
import type { Payment } from '../../types/payment';
import { PAYMENT_METHODS } from '../../types/payment';
import PaymentService from '../../services/paymentService';
import MRTThemeProvider from '../providers/MRTThemeProvider';
import { formatCurrency } from '../../utils/currency';
import { useBusinessStore } from '../../stores/data/BusinessStore';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export function PaymentList() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? Number(projectIdParam) : undefined;

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const where: Record<string, unknown> = {};
      if (businessId != null) where.business_id = businessId;
      if (projectId != null && Number.isFinite(projectId)) where.project_id = projectId;
      const data = await PaymentService.findAll({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: 'date',
        orderDirection: 'DESC',
      });
      setPayments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, projectId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const getPaymentMethodLabel = (value: string | undefined) => {
    const m = PAYMENT_METHODS.find((x) => x.value === value);
    return m?.label ?? value ?? '—';
  };

  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.trim().toLowerCase();
    return payments.filter(
      (p) =>
        p.customer_name?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q) ||
        p.currency?.toLowerCase().includes(q) ||
        getPaymentMethodLabel(p.payment_method).toLowerCase().includes(q)
    );
  }, [payments, search]);

  const columns = useMemo<MRT_ColumnDef<Payment>[]>(
    () => [
      { accessorKey: 'customer_name', header: 'Company', enableColumnFilter: true },
      {
        accessorKey: 'amount',
        header: 'Amount',
        Cell: ({ cell, row }) => formatCurrency(Number(cell.getValue()), row.original.currency),
        enableColumnFilter: false,
      },
      { accessorKey: 'currency', header: 'Currency', enableColumnFilter: true },
      {
        accessorKey: 'date',
        header: 'Date',
        Cell: ({ cell }) => formatDate(String(cell.getValue())),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'payment_method',
        header: 'Method',
        Cell: ({ cell }) => getPaymentMethodLabel(String(cell.getValue() ?? '')),
        enableColumnFilter: true,
      },
      { accessorKey: 'reference', header: 'Reference', enableColumnFilter: true },
    ],
    []
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Payments</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading payments…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Payments</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search payments"
          />
        </div>
        <Link
          to="/app/payments/create"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          + Record payment
        </Link>
      </div>
      <MRTThemeProvider>
        <MaterialReactTable
          columns={columns}
          data={filteredPayments}
          state={{ showAlertBanner: !!error }}
          muiToolbarAlertBannerProps={error ? { color: 'error', children: error } : undefined}
          enableTopToolbar={false}
          enableColumnFilters={false}
          enableGlobalFilter={false}
          enableColumnOrdering={false}
          enableColumnResizing={false}
          initialState={{ density: 'compact' }}
        />
      </MRTThemeProvider>
    </div>
  );
}
