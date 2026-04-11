import { useMemo } from 'react';
import { formatCurrency } from '@/utils/currency';
import { getInvoiceLedgerAmount, isCreditNoteInvoice } from '@/utils/invoiceLedger';
import type { CompanyTabProps } from './types';
import { BUSINESS_TYPE_LABELS } from './types';

export function CompanySummaryTab({ company, invoices, payments, docsLoading }: CompanyTabProps) {
  const balanceByCurrency = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const inv of invoices) {
      const c = inv.currency || 'ZAR';
      byCurrency[c] = (byCurrency[c] ?? 0) + getInvoiceLedgerAmount(inv);
    }
    for (const pay of payments) {
      const c = pay.currency || 'ZAR';
      byCurrency[c] = (byCurrency[c] ?? 0) - Number(pay.amount ?? 0);
    }
    return byCurrency;
  }, [invoices, payments]);

  const totalsByCurrency = useMemo(() => {
    const invoicesTotal: Record<string, number> = {};
    const creditNotesTotal: Record<string, number> = {};
    const paymentsTotal: Record<string, number> = {};
    for (const inv of invoices) {
      const c = inv.currency || 'ZAR';
      const amt = Number(inv.total ?? 0);
      if (isCreditNoteInvoice(inv)) {
        creditNotesTotal[c] = (creditNotesTotal[c] ?? 0) + amt;
      } else {
        invoicesTotal[c] = (invoicesTotal[c] ?? 0) + amt;
      }
    }
    for (const pay of payments) {
      const c = pay.currency || 'ZAR';
      paymentsTotal[c] = (paymentsTotal[c] ?? 0) + Number(pay.amount ?? 0);
    }
    return { invoicesTotal, creditNotesTotal, paymentsTotal };
  }, [invoices, payments]);

  const invoiceDocCount = useMemo(
    () => invoices.filter((inv) => !isCreditNoteInvoice(inv)).length,
    [invoices],
  );
  const creditNoteCount = useMemo(
    () => invoices.filter((inv) => isCreditNoteInvoice(inv)).length,
    [invoices],
  );

  const hasCredentials =
    company.business_type ||
    company.tax_id ||
    company.registration_number ||
    company.vat_number ||
    company.industry ||
    company.website;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">

      {/* Contact info */}
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Contact
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {company.contact_person && (
            <div className="col-span-2 sm:col-span-2">
              <dt className="text-xs text-slate-400 dark:text-slate-500">Contact person</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.contact_person}</dd>
            </div>
          )}
          {company.email && (
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 truncate">{company.email}</dd>
            </div>
          )}
          {company.phone && (
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500">Phone</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.phone}</dd>
            </div>
          )}
          {company.address && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-xs text-slate-400 dark:text-slate-500">Address</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{company.address}</dd>
            </div>
          )}
          {!company.contact_person && !company.email && !company.phone && !company.address && (
            <div className="col-span-4">
              <span className="text-sm text-slate-400 dark:text-slate-500">No contact details recorded.</span>
            </div>
          )}
        </dl>
      </div>

      {/* Financial summary */}
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Financial summary
        </p>
        {docsLoading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p>
        ) : (
          <div className="space-y-3">
            {/* Balance callout */}
            <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {Object.keys(balanceByCurrency).length === 0 ? (
                <span className="text-sm text-slate-400 dark:text-slate-500">No activity yet</span>
              ) : (
                Object.entries(balanceByCurrency).map(([curr, bal]) => {
                  const label = bal > 0 ? 'Owed' : bal < 0 ? 'Credit' : 'Settled';
                  const cls =
                    bal > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : bal < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400';
                  return (
                    <div key={curr}>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
                      <p className={`text-xl font-bold leading-tight ${cls}`}>
                        {formatCurrency(Math.abs(bal), curr)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Invoices + payments breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                  Invoiced
                </p>
                {Object.keys(totalsByCurrency.invoicesTotal).length === 0 ? (
                  <span className="text-sm text-slate-400">—</span>
                ) : (
                  Object.entries(totalsByCurrency.invoicesTotal).map(([curr, tot]) => (
                    <p key={curr} className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      {formatCurrency(tot, curr)}
                    </p>
                  ))
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {invoiceDocCount} invoice{invoiceDocCount !== 1 ? 's' : ''}
                  {creditNoteCount > 0 && (
                    <span className="block text-slate-500 dark:text-slate-400">
                      {creditNoteCount} credit note{creditNoteCount !== 1 ? 's' : ''}:{' '}
                      {Object.entries(totalsByCurrency.creditNotesTotal)
                        .map(([curr, tot]) => formatCurrency(tot, curr))
                        .join(' · ')}
                    </span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/60 dark:border-emerald-800/40">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                  Received
                </p>
                {Object.keys(totalsByCurrency.paymentsTotal).length === 0 ? (
                  <span className="text-sm text-slate-400">—</span>
                ) : (
                  Object.entries(totalsByCurrency.paymentsTotal).map(([curr, tot]) => (
                    <p key={curr} className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                      {formatCurrency(tot, curr)}
                    </p>
                  ))
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business credentials */}
      {hasCredentials && (
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Business credentials
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {company.business_type && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Business type</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">
                  {BUSINESS_TYPE_LABELS[company.business_type] ?? company.business_type}
                </dd>
              </div>
            )}
            {company.tax_id && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Tax ID</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.tax_id}</dd>
              </div>
            )}
            {company.registration_number && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Registration no.</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.registration_number}</dd>
              </div>
            )}
            {company.vat_number && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">VAT number</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.vat_number}</dd>
              </div>
            )}
            {company.industry && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Industry</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{company.industry}</dd>
              </div>
            )}
            {company.website && (
              <div className="col-span-2">
                <dt className="text-xs text-slate-400 dark:text-slate-500">Website</dt>
                <dd className="mt-0.5 text-sm">
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {company.website}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Notes */}
      {company.notes && (
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Notes
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{company.notes}</p>
        </div>
      )}
    </div>
  );
}

export default CompanySummaryTab;
