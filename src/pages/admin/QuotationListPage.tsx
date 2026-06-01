import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table';
import { Box, IconButton, Tooltip } from '@mui/material';
import { LuFileDown, LuFilter } from 'react-icons/lu';
import type { Quotation } from '../../types/quotation';
import { useQuotationStore } from '../../stores/data/QuotationStore';
import { useAutoRefresh, useProjectId } from '../../hooks';
import { formatCurrency } from '../../utils/currency';
import { downloadQuotationPdfById } from '../../utils/quotationPdf';
import MRTThemeProvider from '@/components/providers/MRTThemeProvider';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
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

  // Auto-refresh when quotations table changes (real-time updates)
  useAutoRefresh(projectId, 'quotations', () => fetchQuotations({ status: filterStatus }));

  const filteredQuotations = useMemo(() => {
    if (!search.trim()) return quotations;
    const q = search.trim().toLowerCase();
    return quotations.filter(
      (quo) =>
        (quo.quotation_number?.toLowerCase().includes(q)) ||
        (quo.customer_name?.toLowerCase().includes(q)) ||
        (quo.status?.toLowerCase().includes(q))
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

  const columns = useMemo<MRT_ColumnDef<Quotation>[]>(
    () => [
      { accessorKey: 'quotation_number', header: 'Quotation #', enableColumnFilter: true },
      { accessorKey: 'customer_name', header: 'Company', enableColumnFilter: true },
      {
        accessorKey: 'issue_date',
        header: 'Issue Date',
        Cell: ({ cell }) => formatDate(String(cell.getValue())),
        enableColumnFilter: false,
      },
      {
        accessorKey: 'valid_until',
        header: 'Valid Until',
        Cell: ({ cell }) => {
          const v = cell.getValue();
          return v ? formatDate(String(v)) : '—';
        },
        enableColumnFilter: false,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableColumnFilter: false,
      },
      {
        accessorKey: 'total',
        header: 'Total',
        Cell: ({ cell, row }) => formatCurrency(Number(cell.getValue()), row.original.currency),
        enableColumnFilter: false,
      },
      {
        id: 'export',
        header: 'Export',
        enableColumnFilter: false,
        enableSorting: false,
        size: 70,
        Cell: ({ row }) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Download PDF">
              <IconButton
                size="small"
                onClick={(e) => handleExportPdf(e, row.original.id!)}
                aria-label="Download PDF"
              >
                <LuFileDown size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleExportPdf]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quotations</h1>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading quotations…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quotations</h1>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotations…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search quotations"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="declined">Declined</option>
          <option value="expired">Expired</option>
        </select>
        <Link
          to="/app/quotations/create"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          + New Quotation
        </Link>
      </div>
      <MRTThemeProvider>
        <MaterialReactTable
          columns={columns}
          data={filteredQuotations}
          state={{ showAlertBanner: !!error }}
          muiToolbarAlertBannerProps={error ? { color: 'error', children: error } : undefined}
          enableTopToolbar={false}
          enableColumnFilters={false}
          enableGlobalFilter={false}
          enableColumnOrdering={false}
          enableColumnResizing={false}
          initialState={{ density: 'compact' }}
          muiTableBodyRowProps={({ row }) => ({
            onClick: () => {
              const id = row.original.id;
              if (id != null) navigate(`/app/quotations/${id}`);
            },
            sx: {
              cursor: 'pointer',
            },
          })}
        />
      </MRTThemeProvider>
    </div>
  );
}
