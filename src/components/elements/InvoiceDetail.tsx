import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LuPrinter } from 'react-icons/lu';
import type { Invoice, InvoiceItem } from '../../types/invoice';
import { ACCOUNT_TYPES } from '../../types/bankingDetails';
import StorageService from '../../services/storageService';
import { formatCurrency } from '../../utils/currency';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { useBusinessDocumentContextStore } from '../../stores/data/BusinessDocumentContextStore';
import { isCreditNoteInvoice } from '../../utils/invoiceLedger';
import InvoiceService from '../../services/invoiceService';

interface InvoiceDetailProps {
  invoiceId: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function InvoiceDetail({ invoiceId, onEdit, onDelete }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const business = useBusinessStore((s) => s.currentBusiness);
  const bankingDetails = useBusinessDocumentContextStore((s) => s.bankingDetails);
  const contacts = useBusinessDocumentContextStore((s) => s.contacts);
  const loadDocumentContext = useBusinessDocumentContextStore((s) => s.loadForCurrentBusiness);
  const [creditedInvoiceLabel, setCreditedInvoiceLabel] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (!invoice?.credited_invoice_id) {
      setCreditedInvoiceLabel(null);
      return;
    }
    let cancelled = false;
    void InvoiceService.findById(invoice.credited_invoice_id).then((src) => {
      if (!cancelled && src?.invoice_number) setCreditedInvoiceLabel(src.invoice_number);
    });
    return () => {
      cancelled = true;
    };
  }, [invoice?.credited_invoice_id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const { invoice: inv, items } = await useInvoiceStore.getState().fetchInvoiceWithItems(invoiceId);
      setInvoice(inv);
      setLineItems(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (business?.id == null) return;
    void loadDocumentContext();
  }, [business?.id, loadDocumentContext]);

  useEffect(() => {
    if (!business?.logo_url) { setLogoUrl(null); return; }
    StorageService.getFileDownloadUrl(business.logo_url)
      .then((url) => setLogoUrl(url ?? null))
      .catch(() => setLogoUrl(null));
  }, [business?.logo_url]);

  const handlePrint = useCallback(() => {
    if (!invoice) return;
    const isCn = isCreditNoteInvoice(invoice);
    const prev = document.title;
    document.title = isCn
      ? `credit-note-${invoice.invoice_number}`
      : `invoice-${invoice.invoice_number}`;
    window.print();
    document.title = prev;
  }, [invoice]);

  const handleDelete = async () => {
    if (!invoice) return;
    if (
      !confirm(
        isCreditNoteInvoice(invoice)
          ? 'Are you sure you want to delete this credit note?'
          : 'Are you sure you want to delete this invoice?',
      )
    )
      return;
    try {
      await useInvoiceStore.getState().removeInvoice(invoiceId);
      onDelete?.();
    } catch (err: unknown) {
      alert('Failed to delete invoice: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
      sent: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      paid: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      overdue: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      cancelled: 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400',
    };
    return statusMap[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto p-4 md:p-8">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading invoice...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-[900px] mx-auto p-4 md:p-8">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error || 'Invoice not found'}
        </div>
      </div>
    );
  }

  const vatRate = Number(invoice.tax_rate) || 0;
  const globalDiscountPercent = Number(invoice.discount_percent) || 0;
  const linesSubtotal = lineItems.length > 0
    ? lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
    : Number(invoice.subtotal) || 0;
  const discountAmount = (linesSubtotal * globalDiscountPercent) / 100;
  const subtotal = linesSubtotal - discountAmount;
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  const isCn = isCreditNoteInvoice(invoice);
  const hasPage2 = !!invoice.notes || (!!creditedInvoiceLabel && isCn);

  const creditNoteCreateSearch = new URLSearchParams();
  creditNoteCreateSearch.set('credit_from', String(invoiceId));
  if (invoice.company_id != null) creditNoteCreateSearch.set('company_id', String(invoice.company_id));
  if (invoice.project_id != null) creditNoteCreateSearch.set('project_id', String(invoice.project_id));

  const thClass = 'px-2 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';

  return (
    <div className="invoice-print-root w-full max-w-[794px] mx-auto px-4 py-4 flex flex-col gap-4 print:max-w-none print:px-0 print:py-0 print:gap-0">
      {/* Action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center print:hidden">
        <div>
          <h1 className="m-0 mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isCn ? 'Credit note' : 'Invoice'} {invoice.invoice_number}
          </h1>
          {isCn && creditedInvoiceLabel && (
            <p className="m-0 mb-1 text-xs text-gray-500 dark:text-gray-400">
              Relates to invoice #{creditedInvoiceLabel}
            </p>
          )}
          <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(invoice.status)}`}>
            {invoice.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            <LuPrinter size={15} aria-hidden />Print / Save PDF
          </button>
          {!isCn && (
            <Link
              to={`/app/invoices/create?${creditNoteCreateSearch.toString()}`}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors no-underline"
            >
              Create credit note
            </Link>
          )}
          {onEdit && (
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">Edit</button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
          )}
        </div>
      </div>

      {/* ── Page 1 ── */}
      <div className="invoice-print-page bg-white dark:bg-gray-800 w-full min-h-[1123px] p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col gap-0 print:shadow-none print:border-none print:rounded-none print:min-h-0 print:p-8 print:bg-white dark:print:bg-white">

        {/* ── Header ── */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-gray-300 dark:border-gray-600">
          {/* Left: logo + business name + address */}
          <div className="flex-1 min-w-0">
            {logoUrl && (
              <img src={logoUrl} alt="logo" className="mb-2 max-h-14 max-w-[120px] object-contain" />
            )}
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{business?.name ?? '—'}</p>
            {business?.address && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line leading-snug max-w-[160px]">{business.address}</p>
            )}
          </div>

          {/* Middle: Tel / VAT / Reg */}
          <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400 pt-1 px-4">
            {business?.phone && <span>Tel: {business.phone}</span>}
            {business?.vat_number && <span>VAT: {business.vat_number}</span>}
            {business?.registration_number && <span>Reg: {business.registration_number}</span>}
            {contacts[0]?.email && <span>{contacts[0].email}</span>}
          </div>

          {/* Right: document title / number / status */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-wide uppercase leading-none">
              {isCn ? 'Credit note' : 'Invoice'}
            </p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{invoice.invoice_number}</p>
            {invoice.order_number && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Order: {invoice.order_number}</p>
            )}
            <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${getStatusBadgeClass(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* ── Bill To / Deliver To ── */}
        <div className="grid grid-cols-2 gap-6 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bill To</p>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{invoice.customer_name}</p>
            {invoice.customer_vat_number && <p className="text-xs text-gray-500 dark:text-gray-400">VAT: {invoice.customer_vat_number}</p>}
            {invoice.customer_address && <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{invoice.customer_address}</p>}
            {invoice.customer_email && <p className="text-xs text-gray-500 dark:text-gray-400">{invoice.customer_email}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Deliver To</p>
            {invoice.delivery_address ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{invoice.delivery_address}</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Same as billing address</p>
            )}
            {invoice.delivery_conditions && (
              <p className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Delivery: {invoice.delivery_conditions === 'collect' ? 'COLLECT' : 'DELIVER'}
              </p>
            )}
          </div>
        </div>

        {/* ── Dates row ── */}
        <div className="flex flex-wrap gap-x-8 gap-y-1 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
          <span><span className="text-gray-400 dark:text-gray-500">Issue Date: </span>{formatDate(invoice.issue_date)}</span>
          <span><span className="text-gray-400 dark:text-gray-500">Due Date: </span>{formatDate(invoice.due_date)}</span>
          {invoice.terms && (
            <span><span className="text-gray-400 dark:text-gray-500">Terms: </span>{invoice.terms}</span>
          )}
        </div>

        {/* ── Line items table ── */}
        <div className="mb-4">
          {lineItems.length > 0 ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <th className={`${thClass} w-8 border-r border-gray-200 dark:border-gray-600`}>No.</th>
                  <th className={`${thClass} w-20 border-r border-gray-200 dark:border-gray-600`}>SKU</th>
                  <th className={`${thClass} border-r border-gray-200 dark:border-gray-600`}>Description</th>
                  <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Qty</th>
                  <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Unit Price</th>
                  <th className={`${thClass} text-right`}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const unitPrice = Number(item.unit_price) || 0;
                  const itemTotal = Number(item.total) ?? qty * unitPrice;
                  return (
                    <tr
                      key={item.id ?? `${item.description}-${idx}`}
                      className={`border border-gray-200 dark:border-gray-700 ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`}
                    >
                      <td className="px-2 py-1 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-600">{idx + 1}</td>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">{item.sku ?? '—'}</td>
                      <td className="px-2 py-1 text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600">{item.description}</td>
                      <td className="px-2 py-1 text-right text-green-600 dark:text-green-400 font-medium border-r border-gray-200 dark:border-gray-600">
                        {qty}{item.unit_type === 'hrs' ? ' hrs' : ''}
                      </td>
                      <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">{formatCurrency(unitPrice, invoice.currency)}</td>
                      <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-200 font-medium">{formatCurrency(itemTotal, invoice.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No line items.</p>
          )}
        </div>

        {/* ── Banking + Totals — pushed to bottom ── */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 items-start print:break-inside-avoid">
            {/* Banking */}
            {bankingDetails.length > 0 ? (
              <div className="text-xs">
                <p className="mb-1.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Banking Details</p>
                {bankingDetails.map((bd) => (
                  <div key={bd.id} className="mb-3">
                    {bd.label && <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{bd.label}</p>}
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400 dark:text-gray-500">Bank</span><span>{bd.bank_name}</span>
                      {bd.account_holder && (<><span className="text-gray-400 dark:text-gray-500">Acc. Holder</span><span>{bd.account_holder}</span></>)}
                      <span className="text-gray-400 dark:text-gray-500">Account No.</span><span>{bd.account_number}</span>
                      {bd.account_type && (<><span className="text-gray-400 dark:text-gray-500">Acc. Type</span><span>{ACCOUNT_TYPES.find((t) => t.value === bd.account_type)?.label ?? bd.account_type}</span></>)}
                      {bd.branch_code && (<><span className="text-gray-400 dark:text-gray-500">Branch Code</span><span>{bd.branch_code}</span></>)}
                      {bd.swift_code && (<><span className="text-gray-400 dark:text-gray-500">SWIFT</span><span>{bd.swift_code}</span></>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div />}

            {/* Totals */}
            <div className="text-xs">
              {globalDiscountPercent > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                  <span>Lines subtotal</span>
                  <span>{formatCurrency(linesSubtotal, invoice.currency)}</span>
                </div>
              )}
              {globalDiscountPercent > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-green-600 dark:text-green-400">
                  <span>Discount ({globalDiscountPercent}%)</span>
                  <span>−{formatCurrency(discountAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                <span>VAT ({vatRate}%)</span>
                <span>{formatCurrency(vatAmount, invoice.currency)}</span>
              </div>
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-700 dark:border-gray-300 text-sm font-bold text-gray-900 dark:text-gray-100">
                <span>Total</span>
                <span>{formatCurrency(total, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-gray-300 dark:text-gray-600">Foroman by Bobo Softwares (2026)</p>
        </div>
      </div>

      {/* ── Page 2 — notes ── */}
      {hasPage2 && (
        <div className="invoice-print-page bg-white dark:bg-gray-800 w-full min-h-[1123px] p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col print:shadow-none print:border-none print:rounded-none print:min-h-0 print:p-8 print:bg-white dark:print:bg-white">
          <div className="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes</p>
            <p className="m-0 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
              {isCn && creditedInvoiceLabel && (
                <>
                  This credit note relates to invoice #{creditedInvoiceLabel}.
                  {invoice.notes?.trim() ? '\n\n' : ''}
                </>
              )}
              {invoice.notes}
            </p>
          </div>
          <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-gray-300 dark:text-gray-600">Foroman by Bobo Softwares (2026)</p>
          </div>
        </div>
      )}
    </div>
  );
}
