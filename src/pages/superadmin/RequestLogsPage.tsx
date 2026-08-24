import { useEffect, useState } from 'react';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppButton from '@/components/buttons/AppButton';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import {
  requestLogService,
  type RequestLogFilters,
  type RequestLogRow,
} from '@/services/requestLogService';
import { RequestLogDetailModal } from './RequestLogDetailModal';

const PAGE_SIZE = 50;

const columns: AppDataTableColumn<RequestLogRow>[] = [
  {
    id: 'createdAt',
    header: 'Time',
    render: (row) => new Date(`${row.createdAt.replace(' ', 'T')}Z`).toLocaleString(),
  },
  { id: 'method', header: 'Method', render: (row) => row.method },
  { id: 'url', header: 'URL', render: (row) => row.url },
  {
    id: 'statusCode',
    header: 'Status',
    align: 'right',
    render: (row) => (
      <span className={row.statusCode >= 400 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
        {row.statusCode}
      </span>
    ),
  },
  { id: 'durationMs', header: 'Duration (ms)', align: 'right', render: (row) => row.durationMs },
  { id: 'companyId', header: 'Company', render: (row) => row.companyId ?? '—' },
  {
    id: 'user',
    header: 'User',
    render: (row) => row.userEmail ?? (row.userId ? `#${row.userId}` : '—'),
  },
];

export function RequestLogsPage() {
  const [method, setMethod] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  const [rows, setRows] = useState<RequestLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filters: RequestLogFilters = {
    method: method || undefined,
    statusCode: statusCode ? Number(statusCode) : undefined,
    companyId: companyId ? Number(companyId) : undefined,
    userId: userId ? Number(userId) : undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    requestLogService
      .list({ ...filters, limit: PAGE_SIZE, offset })
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load request logs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, offset]);

  const resetToFirstPage = () => setOffset(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">API Request Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Superadmin-only view of backend API traffic.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <AppInputLabeled
              label="Method"
              value={method}
              onChange={(e) => { setMethod(e.target.value.toUpperCase()); resetToFirstPage(); }}
              placeholder="GET"
            />
            <AppInputLabeled
              label="Status code"
              type="number"
              value={statusCode}
              onChange={(e) => { setStatusCode(e.target.value); resetToFirstPage(); }}
              placeholder="500"
            />
            <AppInputLabeled
              label="Company ID"
              type="number"
              value={companyId}
              onChange={(e) => { setCompanyId(e.target.value); resetToFirstPage(); }}
            />
            <AppInputLabeled
              label="User ID"
              type="number"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); resetToFirstPage(); }}
            />
            <AppInputLabeled
              label="From"
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); resetToFirstPage(); }}
            />
            <AppInputLabeled
              label="To"
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); resetToFirstPage(); }}
            />
          </div>
        </div>

        <AppDataTable
          title="Requests"
          columns={columns}
          data={rows}
          getRowKey={(row) => row.id}
          onRowClick={(row) => setSelectedId(row.id)}
          loading={loading}
          error={error}
          emptyMessage="No requests found for this filter."
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {total.toLocaleString()} total requests — page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <AppButton
              label="Prev"
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            />
            <AppButton
              label="Next"
              variant="outline"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            />
          </div>
        </div>
      </div>

      {selectedId != null && (
        <RequestLogDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

export default RequestLogsPage;
