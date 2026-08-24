import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import StatementPortalService from '@/services/statementPortalService';
import type { BankingDetails } from '@/types/bankingDetails';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import type { Business } from '@/types/business';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { formatCurrency } from '@/utils/currency';
import { generateInvoicePdf } from '@/utils/invoicePdf';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'long' });
}

export function StatementPortalInvoiceViewPage() {
  usePortalNoIndex();
  const navigate = useNavigate();
  const { companyId: companyIdParam, invoiceId: invoiceIdParam } = useParams<{
    companyId: string;
    invoiceId: string;
  }>();
  const companyId = Number(companyIdParam);
  const invoiceId = Number(invoiceIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);

  useEffect(() => {
    if (!StatementPortalService.hasSession()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    StatementPortalService.getInvoice(companyId, invoiceId)
      .then((result) => {
        if (cancelled) return;
        setInvoice(result.invoice);
        setLineItems(result.lineItems);
        setBusiness(result.business);
        setBankingDetails(result.bankingDetails);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          navigate('/statements');
        } else {
          setError('This invoice is not available.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, invoiceId, navigate]);

  const handleDownloadPdf = useCallback(async () => {
    if (!invoice) return;
    await generateInvoicePdf(invoice, lineItems, business);
  }, [invoice, lineItems, business]);

  if (!StatementPortalService.hasSession()) {
    return <Navigate to="/statements" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p className="text-slate-700 dark:text-slate-200 text-center max-w-md text-sm">{error ?? 'Not available.'}</p>
        <Link to={`/statements/${companyId}`} className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
          Back to statement
        </Link>
      </div>
    );
  }

  const isCn = isCreditNoteInvoice(invoice);
  const taxEnabled = business?.tax_enabled ?? true;
  const vatRate = taxEnabled ? Number(invoice.tax_rate) || 0 : 0;
  const linesSubtotal =
    lineItems.length > 0 ? lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0) : Number(invoice.subtotal) || 0;
  const vatAmount = (linesSubtotal * vatRate) / 100;
  const total = linesSubtotal + vatAmount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white print:text-black">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={`/statements/${companyId}`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              ← Back to statement
            </Link>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
              {isCn ? 'Credit note' : 'Invoice'} {invoice.invoice_number}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{business?.name ?? '—'}</p>
              {business?.address && (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{business.address}</p>
              )}
              {business?.vat_number && <p className="text-xs text-slate-500 dark:text-slate-400">VAT: {business.vat_number}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
              </p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {invoice.status}
              </span>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bill to</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{invoice.customer_name}</p>
            {invoice.customer_address && (
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{invoice.customer_address}</p>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qty</th>
                <th className="py-2 text-right">Unit price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lineItems.map((item, idx) => (
                <tr key={item.id ?? idx}>
                  <td className="py-2 text-slate-800 dark:text-slate-200">{item.description}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
                  <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(Number(item.unit_price), invoice.currency)}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                    {formatCurrency(Number(item.total), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
            {bankingDetails ? (
              <div className="text-xs">
                <p className="mb-1.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Payment / banking details
                </p>
                {bankingDetails.label && (
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">{bankingDetails.label}</p>
                )}
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-slate-600 dark:text-slate-400">
                  <span className="text-slate-400 dark:text-slate-500">Bank</span>
                  <span>{bankingDetails.bank_name}</span>
                  {bankingDetails.account_holder && (
                    <>
                      <span className="text-slate-400 dark:text-slate-500">Acc. holder</span>
                      <span>{bankingDetails.account_holder}</span>
                    </>
                  )}
                  <span className="text-slate-400 dark:text-slate-500">Account no.</span>
                  <span>{bankingDetails.account_number}</span>
                  {bankingDetails.account_type && (
                    <>
                      <span className="text-slate-400 dark:text-slate-500">Acc. type</span>
                      <span>
                        {ACCOUNT_TYPES.find((t) => t.value === bankingDetails.account_type)?.label ??
                          bankingDetails.account_type}
                      </span>
                    </>
                  )}
                  {bankingDetails.branch_code && (
                    <>
                      <span className="text-slate-400 dark:text-slate-500">Branch code</span>
                      <span>{bankingDetails.branch_code}</span>
                    </>
                  )}
                  {bankingDetails.swift_code && (
                    <>
                      <span className="text-slate-400 dark:text-slate-500">SWIFT</span>
                      <span>{bankingDetails.swift_code}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="text-sm space-y-1 sm:justify-self-end sm:w-56">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(linesSubtotal, invoice.currency)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>VAT ({vatRate}%)</span>
                  <span>{formatCurrency(vatAmount, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 mt-1 border-t-2 border-slate-700 dark:border-slate-300 text-base font-bold text-slate-900 dark:text-slate-100">
                <span>Total</span>
                <span>{formatCurrency(total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default StatementPortalInvoiceViewPage;
