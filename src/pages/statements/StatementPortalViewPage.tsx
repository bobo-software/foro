import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePortalNoIndex } from '@/hooks/usePortalNoIndex';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import StatementPortalService from '@/services/statementPortalService';
import type { BankingDetails } from '@/types/bankingDetails';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import type { Business } from '@/types/business';
import type { StatementPortalCompany, StatementRow } from '@/types/statementPortal';
import { formatCurrency } from '@/utils/currency';
import { generateStatementPdf } from '@/utils/statementPdf';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function StatementPortalViewPage() {
  usePortalNoIndex();
  const navigate = useNavigate();
  const { companyId: companyIdParam } = useParams<{ companyId: string }>();
  const companyId = Number(companyIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<StatementPortalCompany | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [currency, setCurrency] = useState<string>('ZAR');

  useEffect(() => {
    if (!StatementPortalService.hasSession()) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    StatementPortalService.getStatement(companyId)
      .then((result) => {
        if (cancelled) return;
        setCompany(result.company);
        setBusiness(result.business);
        setBankingDetails(result.bankingDetails);
        setRows(result.rows);
        setCurrency(result.rows[0]?.currency ?? 'ZAR');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        if (status === 403 || status === 404) {
          setError('You do not have access to this statement.');
        } else if (status === 401) {
          navigate('/statements');
        } else {
          setError('We could not load this statement. Please try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, navigate]);

  const currencies = useMemo(() => [...new Set(rows.map((r) => r.currency))], [rows]);
  const filteredRows = useMemo(() => rows.filter((r) => r.currency === currency), [rows, currency]);

  const totals = useMemo(() => {
    const totalDebits = filteredRows.reduce((s, r) => s + r.debit, 0);
    const totalCredits = filteredRows.reduce((s, r) => s + r.credit, 0);
    const openingBalance =
      filteredRows.length > 0 ? filteredRows[0].balance - filteredRows[0].debit + filteredRows[0].credit : 0;
    const closingBalance = filteredRows.length > 0 ? filteredRows[filteredRows.length - 1].balance : 0;
    return { totalDebits, totalCredits, openingBalance, closingBalance };
  }, [filteredRows]);

  const handleDownloadPdf = useCallback(async () => {
    if (!company) return;
    const from = filteredRows[0]?.date ?? '';
    const to = filteredRows[filteredRows.length - 1]?.date ?? from;
    await generateStatementPdf(company.name, from, to, filteredRows, currency, business);
  }, [company, filteredRows, currency, business]);

  const handlePrint = useCallback(() => {
    if (!company) return;
    const prev = document.title;
    document.title = `statement-${company.name}`;
    window.print();
    document.title = prev;
  }, [company]);

  if (!StatementPortalService.hasSession()) {
    return <Navigate to="/statements" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-4xl space-y-4 animate-pulse" aria-busy="true" aria-label="Loading statement">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-32" />
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
          <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <p className="text-slate-700 dark:text-slate-200 text-center max-w-md text-sm">{error ?? 'Not available.'}</p>
        <Link to="/statements" className="mt-6 text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
          Back to statement portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 print:bg-white print:text-black">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Statement of account</p>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{company.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currencies.length > 1 && (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <ThemeToggleButton />
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={filteredRows.length === 0}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => {
                StatementPortalService.logout();
                navigate('/statements');
              }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3 text-sm">
            <div>
              <dt className="inline font-medium text-slate-500 dark:text-slate-400">Account </dt>
              <dd className="inline text-slate-800 dark:text-slate-200">{company.name}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500 dark:text-slate-400">Period </dt>
              <dd className="inline text-slate-800 dark:text-slate-200">
                {filteredRows.length > 0
                  ? `${formatDate(filteredRows[0].date)} – ${formatDate(filteredRows[filteredRows.length - 1].date)}`
                  : 'No transactions'}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium text-slate-500 dark:text-slate-400">Currency </dt>
              <dd className="inline text-slate-800 dark:text-slate-200">{currency}</dd>
            </div>
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Opening balance
            </p>
            <p className="mt-0.5 text-base font-semibold text-slate-800 dark:text-slate-200">
              {formatCurrency(totals.openingBalance, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Total invoiced
            </p>
            <p className="mt-0.5 text-base font-semibold text-amber-800 dark:text-amber-200">
              {formatCurrency(totals.totalDebits, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Total paid/credited
            </p>
            <p className="mt-0.5 text-base font-semibold text-emerald-800 dark:text-emerald-200">
              {formatCurrency(totals.totalCredits, currency)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Balance due
            </p>
            <p
              className={`mt-0.5 text-base font-bold ${
                totals.closingBalance > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : totals.closingBalance < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {formatCurrency(totals.closingBalance, currency)}
            </p>
          </div>
        </div>

        {bankingDetails && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-4">
            <p className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Payment / banking details
            </p>
            {bankingDetails.label && (
              <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{bankingDetails.label}</p>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3 text-sm">
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Bank </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.bank_name}</dd>
              </div>
              {bankingDetails.account_holder && (
                <div>
                  <dt className="inline font-medium text-slate-500 dark:text-slate-400">Account holder </dt>
                  <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.account_holder}</dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Account number </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.account_number}</dd>
              </div>
              {bankingDetails.account_type && (
                <div>
                  <dt className="inline font-medium text-slate-500 dark:text-slate-400">Account type </dt>
                  <dd className="inline text-slate-800 dark:text-slate-200">
                    {ACCOUNT_TYPES.find((t) => t.value === bankingDetails.account_type)?.label ??
                      bankingDetails.account_type}
                  </dd>
                </div>
              )}
              {bankingDetails.branch_code && (
                <div>
                  <dt className="inline font-medium text-slate-500 dark:text-slate-400">Branch code </dt>
                  <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.branch_code}</dd>
                </div>
              )}
              {bankingDetails.swift_code && (
                <div>
                  <dt className="inline font-medium text-slate-500 dark:text-slate-400">SWIFT </dt>
                  <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.swift_code}</dd>
                </div>
              )}
              {bankingDetails.iban && (
                <div>
                  <dt className="inline font-medium text-slate-500 dark:text-slate-400">IBAN </dt>
                  <dd className="inline text-slate-800 dark:text-slate-200">{bankingDetails.iban}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold text-right">Debit</th>
                <th className="px-4 py-3 font-semibold text-right">Credit</th>
                <th className="px-4 py-3 font-semibold text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => {
                  const clickable = row.type !== 'payment' && row.invoiceId != null;
                  return (
                    <tr
                      key={`${row.date}-${row.type}-${row.reference}-${i}`}
                      className={`${i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''} ${
                        clickable ? 'hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer' : ''
                      }`}
                      onClick={clickable ? () => navigate(`/statements/${companyId}/invoices/${row.invoiceId}`) : undefined}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            row.type === 'invoice'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : row.type === 'credit_note'
                                ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}
                        >
                          {row.type === 'invoice' ? 'Invoice' : row.type === 'credit_note' ? 'Credit note' : 'Payment'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {clickable ? (
                          <span className="text-indigo-600 dark:text-indigo-400 hover:underline">{row.reference}</span>
                        ) : (
                          row.reference
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(row.balance, row.currency)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-700/60 border-t-2 border-slate-300 dark:border-slate-600">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatCurrency(totals.totalDebits, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatCurrency(totals.totalCredits, currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(totals.closingBalance, currency)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>
    </div>
  );
}

export default StatementPortalViewPage;
