import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import InvoiceService from '@/services/invoiceService';
import QuotationService from '@/services/quotationService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';
import { formatTrashPurgeDate } from '@/utils/salesTrash';
import type { Invoice } from '@/types/invoice';
import type { Quotation } from '@/types/quotation';

type TrashKind = 'invoice' | 'credit_note' | 'quotation';

interface TrashRow {
  key: string;
  kind: TrashKind;
  id: number;
  number: string;
  customer: string;
  deletedAt: string;
  href: string;
}

function kindLabel(kind: TrashKind): string {
  if (kind === 'credit_note') return 'Credit note';
  if (kind === 'quotation') return 'Quotation';
  return 'Invoice';
}

function toInvoiceRow(inv: Invoice): TrashRow | null {
  if (inv.id == null || !inv.deleted_at) return null;
  const kind: TrashKind = isCreditNoteInvoice(inv) ? 'credit_note' : 'invoice';
  return {
    key: `invoice-${inv.id}`,
    kind,
    id: inv.id,
    number: inv.invoice_number,
    customer: inv.customer_name,
    deletedAt: inv.deleted_at,
    href: `/app/invoices/${inv.id}`,
  };
}

function toQuotationRow(q: Quotation): TrashRow | null {
  if (q.id == null || !q.deleted_at) return null;
  return {
    key: `quotation-${q.id}`,
    kind: 'quotation',
    id: q.id,
    number: q.quotation_number,
    customer: q.customer_name,
    deletedAt: q.deleted_at,
    href: `/app/quotations/${q.id}`,
  };
}

export function DocumentsTrashPage() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringKey, setRestoringKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const where = businessId != null ? { business_id: businessId } : undefined;
      const [invoices, quotations] = await Promise.all([
        InvoiceService.findAll({ where, trashed: true, orderBy: 'updated_at', orderDirection: 'DESC' }),
        QuotationService.findAll({ where, trashed: true, orderBy: 'updated_at', orderDirection: 'DESC' }),
      ]);
      const combined = [
        ...invoices.map(toInvoiceRow),
        ...quotations.map(toQuotationRow),
      ].filter((row): row is TrashRow => row != null);
      combined.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
      setRows(combined);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load trash');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRestore = useCallback(async (row: TrashRow, event?: MouseEvent) => {
    event?.stopPropagation();
    setRestoringKey(row.key);
    try {
      if (row.kind === 'quotation') {
        await QuotationService.restore(row.id);
      } else {
        await InvoiceService.restore(row.id);
      }
      setRows((prev) => prev.filter((r) => r.key !== row.key));
    } catch (err: unknown) {
      alert('Failed to restore: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setRestoringKey(null);
    }
  }, []);

  const columns = useMemo<AppDataTableColumn<TrashRow>[]>(
    () => [
      {
        id: 'kind',
        header: 'Type',
        cellClassName: 'text-slate-600 dark:text-slate-300 whitespace-nowrap',
        render: (row) => kindLabel(row.kind),
      },
      {
        id: 'number',
        header: 'Number',
        cellClassName: 'font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap',
        render: (row) => row.number,
      },
      {
        id: 'customer',
        header: 'Customer',
        cellClassName: 'text-slate-800 dark:text-slate-100',
        render: (row) => row.customer,
      },
      {
        id: 'deleted',
        header: 'Deleted',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => new Date(row.deletedAt.includes('T') ? row.deletedAt : `${row.deletedAt.replace(' ', 'T')}Z`).toLocaleDateString(),
      },
      {
        id: 'purge',
        header: 'Deletes on',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => formatTrashPurgeDate(row.deletedAt),
      },
      {
        id: 'actions',
        header: '',
        headerClassName: 'w-24',
        cellClassName: 'text-right',
        render: (row) => (
          <button
            type="button"
            disabled={restoringKey === row.key}
            onClick={(e) => void handleRestore(row, e)}
            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {restoringKey === row.key ? 'Restoring…' : 'Restore'}
          </button>
        ),
      },
    ],
    [handleRestore, restoringKey],
  );

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => row.key}
      onRowClick={(row) => navigate(row.href)}
      loading={loading}
      error={error}
      emptyMessage="Trash is empty."
      embedded
    />
  );
}

export default DocumentsTrashPage;
