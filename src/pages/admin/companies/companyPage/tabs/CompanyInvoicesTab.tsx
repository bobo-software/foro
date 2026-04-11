import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuEllipsisVertical, LuPlus } from 'react-icons/lu';
import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { formatCurrency } from '@/utils/currency';
import { isCreditNoteInvoice, invoiceTableRowClassName } from '@/utils/invoiceLedger';
import type { Invoice } from '@/types/invoice';
import { useInvoiceStore } from '@/stores/data/InvoiceStore';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

type Props = CompanyTabProps & { onRefresh?: () => void };

function sortInvoicesByIssueDateDesc(rows: Invoice[]): Invoice[] {
  return [...rows].sort((a, b) => {
    const da = a.issue_date ?? '';
    const db = b.issue_date ?? '';
    return db.localeCompare(da);
  });
}

export function CompanyInvoicesTab({ company, selectedProjectId, invoices, docsLoading, onRefresh }: Props) {
  const navigate = useNavigate();
  const projectQuery = selectedProjectId !== 'all' ? `&project_id=${selectedProjectId}` : '';
  const fromCompany = `&from_company=${company.id}`;
  const createBase = `/app/invoices/create?company_id=${company.id}${projectQuery}${fromCompany}`;

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuInvoice, setMenuInvoice] = useState<Invoice | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedInvoices = useMemo(() => sortInvoicesByIssueDateDesc(invoices), [invoices]);

  const closeMenu = useCallback(() => {
    setMenuAnchor(null);
    setMenuInvoice(null);
  }, []);

  const openMenu = useCallback((event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuInvoice(invoice);
  }, []);

  const handleDelete = useCallback(async () => {
    const inv = menuInvoice;
    if (!inv?.id) return;
    const label = isCreditNoteInvoice(inv) ? 'this credit note' : 'this invoice';
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    closeMenu();
    setDeletingId(inv.id);
    try {
      await useInvoiceStore.getState().removeInvoice(inv.id);
      onRefresh?.();
    } catch {
      alert('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  }, [menuInvoice, closeMenu, onRefresh]);

  const columns = useMemo<AppDataTableColumn<Invoice>[]>(
    () => [
      {
        id: 'invoice_number',
        header: 'Document',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (inv) => (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            {isCreditNoteInvoice(inv) ? (
              <span
                className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200"
                title="Credit note"
              >
                CN
              </span>
            ) : null}
            <span className="truncate">{String(inv.invoice_number ?? '—')}</span>
          </span>
        ),
      },
      {
        id: 'issue_date',
        header: 'Date',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (inv) => (inv.issue_date ? formatDate(inv.issue_date) : '—'),
      },
      {
        id: 'due_date',
        header: 'Due',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (inv) => (inv.due_date ? formatDate(inv.due_date) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (inv) => {
          const val = String(inv.status ?? '—');
          return val.charAt(0).toUpperCase() + val.slice(1);
        },
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (inv) => formatCurrency(Number(inv.total), inv.currency),
      },
      {
        id: 'actions',
        header: '',
        headerClassName: 'w-8 !px-1',
        cellClassName: 'w-8 !px-1 text-right',
        render: (inv) => {
          const id = inv.id;
          if (id == null) return null;
          return (
            <button
              type="button"
              aria-label="Open row menu"
              aria-haspopup="true"
              aria-expanded={menuInvoice?.id === id && Boolean(menuAnchor)}
              disabled={deletingId === id}
              onClick={(e) => openMenu(e, inv)}
              className="inline-flex items-center justify-center rounded-md p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"
            >
              <LuEllipsisVertical className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            </button>
          );
        },
      },
    ],
    [deletingId, menuAnchor, menuInvoice?.id, openMenu],
  );

  const menuOpen = Boolean(menuAnchor);
  const creditNoteHref =
    menuInvoice?.id != null
      ? `/app/invoices/create?credit_from=${menuInvoice.id}&company_id=${company.id}${projectQuery}${fromCompany}`
      : '';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Invoices ({invoices.length})
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Invoices and credit notes for {company.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to={createBase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-lg transition-colors no-underline"
          >
            <LuPlus className="w-3.5 h-3.5" />
            New invoice
          </Link>
        </div>
      </div>

      <>
        <AppDataTable<Invoice>
          embedded
          columns={columns}
          data={sortedInvoices}
          getRowKey={(row, index) => row.id ?? `inv-${index}`}
          getRowClassName={invoiceTableRowClassName}
          onRowClick={(inv) => {
            if (inv.id != null) navigate(`/app/invoices/${inv.id}?from_company=${company.id}`);
          }}
          loading={docsLoading}
          emptyMessage="No invoices for this company yet."
        />
        <Menu
          anchorEl={menuAnchor}
          open={menuOpen}
          onClose={closeMenu}
          onClick={(e) => e.stopPropagation()}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              className: 'min-w-[200px]',
            },
          }}
        >
          {menuInvoice?.id != null && (
            <MenuItem
              onClick={() => {
                navigate(`/app/invoices/${menuInvoice.id}/edit?from_company=${company.id}`);
                closeMenu();
              }}
            >
              <ListItemIcon>
                <EditOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Edit</ListItemText>
            </MenuItem>
          )}
          {menuInvoice && !isCreditNoteInvoice(menuInvoice) && menuInvoice.id != null && (
            <MenuItem component={Link} to={creditNoteHref} onClick={closeMenu} className="no-underline text-inherit">
              <ListItemIcon>
                <NoteAddOutlinedIcon fontSize="small" className="text-violet-600" />
              </ListItemIcon>
              <ListItemText>Create credit note</ListItemText>
            </MenuItem>
          )}
          {menuInvoice?.id != null && (
            <MenuItem onClick={handleDelete} disabled={deletingId === menuInvoice.id} className="text-red-600">
              <ListItemIcon>
                <DeleteOutlineIcon fontSize="small" className="text-red-600" />
              </ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </>
    </div>
  );
}

export default CompanyInvoicesTab;
