import { useState, useCallback, useMemo, useEffect } from 'react';
import InvoiceService from '@/services/invoiceService';
import PaymentService from '@/services/paymentService';
import { formatCurrency, SUPPORTED_CURRENCIES } from '@/utils/currency';
import { generateStatementPdf, type StatementRow } from '@/utils/statementPdf';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { isCreditNoteInvoice } from '@/utils/invoiceLedger';
import type { CompanyTabProps } from './types';
import { formatDate } from './types';

function firstDayOfCurrentMonth(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0];
}

function lastDayOfCurrentMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

export function CompanyStatementsTab({ company, projects = [], selectedProjectId = 'all' }: CompanyTabProps) {
  const business = useBusinessStore((s) => s.currentBusiness);
  const [stmtFromDate, setStmtFromDate] = useState<string>(() => firstDayOfCurrentMonth());
  const [stmtToDate, setStmtToDate] = useState<string>(() => lastDayOfCurrentMonth());
  const [stmtCurrency, setStmtCurrency] = useState<string>('ZAR');
  const [stmtRows, setStmtRows] = useState<StatementRow[]>([]);
  const [stmtLoading, setStmtLoading] = useState(false);
  const [stmtGenerated, setStmtGenerated] = useState(false);
  const [stmtScope, setStmtScope] = useState<'company' | 'project'>('company');
  const [stmtProjectId, setStmtProjectId] = useState<number | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === stmtProjectId) ?? null,
    [projects, stmtProjectId]
  );

  const scopeLabel = stmtScope === 'project'
    ? selectedProject?.name ?? 'Project'
    : 'All projects';

  const ensureProjectScopeSelection = useCallback(() => {
    if (stmtScope !== 'project') return true;
    if (stmtProjectId != null) return true;
    return false;
  }, [stmtScope, stmtProjectId]);

  useEffect(() => {
    if (selectedProjectId !== 'all') {
      setStmtScope('project');
      setStmtProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  const generateStatement = useCallback(async () => {
    if (!company?.name) return;
    setStmtLoading(true);
    setStmtGenerated(false);
    try {
      const [invList, payList] = await Promise.all([
        InvoiceService.findAll({
          where: {
            customer_name: company.name,
            ...(stmtScope === 'project' && stmtProjectId != null ? { project_id: stmtProjectId } : {}),
          },
          orderBy: 'issue_date',
          orderDirection: 'ASC',
          limit: 1000,
        }),
        PaymentService.findByCompany(
          company.name,
          stmtScope === 'project' && stmtProjectId != null ? { projectId: stmtProjectId } : undefined
        ),
      ]);

      const from = stmtFromDate || '1970-01-01';
      const to = stmtToDate || '9999-12-31';
      const filterByDate = (d: string) => d >= from && d <= to;

      const combined: Array<{
        date: string;
        type: 'invoice' | 'payment' | 'credit_note';
        reference: string;
        amount: number;
        currency: string;
      }> = [];
      for (const inv of invList) {
        const d = inv.issue_date?.split('T')[0] ?? inv.issue_date ?? '';
        if (filterByDate(d)) {
          const isCn = isCreditNoteInvoice(inv);
          combined.push({
            date: d,
            type: isCn ? 'credit_note' : 'invoice',
            reference: inv.invoice_number ?? (isCn ? `CN #${inv.id}` : `Invoice #${inv.id}`),
            amount: Number(inv.total) || 0,
            currency: inv.currency || 'ZAR',
          });
        }
      }
      for (const pay of payList) {
        const d = pay.date?.split('T')[0] ?? pay.date ?? '';
        if (filterByDate(d)) {
          combined.push({
            date: d,
            type: 'payment',
            reference: pay.reference || `Payment #${pay.id}`,
            amount: Number(pay.amount) || 0,
            currency: pay.currency || 'ZAR',
          });
        }
      }
      combined.sort((a, b) => a.date.localeCompare(b.date));

      const byCurrency = new Map<string, StatementRow[]>();
      for (const item of combined) {
        const c = item.currency;
        if (!byCurrency.has(c)) byCurrency.set(c, []);
        const list = byCurrency.get(c)!;
        const prevBalance = list.length > 0 ? list[list.length - 1].balance : 0;
        const isDebit = item.type === 'invoice';
        const isCredit = item.type === 'payment' || item.type === 'credit_note';
        const balance = isDebit ? prevBalance + item.amount : prevBalance - item.amount;
        list.push({
          date: item.date,
          type: item.type,
          reference: item.reference,
          debit: isDebit ? item.amount : 0,
          credit: isCredit ? item.amount : 0,
          balance,
          currency: c,
        });
      }

      const allRows: StatementRow[] = [];
      byCurrency.forEach((list) => allRows.push(...list));
      allRows.sort((a, b) => a.date.localeCompare(b.date));
      setStmtRows(allRows);
      setStmtGenerated(true);
    } catch (err) {
      console.error(err);
      setStmtRows([]);
    } finally {
      setStmtLoading(false);
    }
  }, [company?.name, stmtFromDate, stmtToDate, stmtScope, stmtProjectId]);

  const handleDownloadStatementPdf = useCallback(async () => {
    if (!company?.name || stmtRows.length === 0) return;
    const from = (stmtFromDate || stmtRows[0]?.date) ?? '';
    const to = (stmtToDate || stmtRows[stmtRows.length - 1]?.date) ?? '';
    await generateStatementPdf(company.name, from, to, stmtRows, stmtCurrency, business, scopeLabel);
  }, [company?.name, stmtFromDate, stmtToDate, stmtRows, stmtCurrency, business, scopeLabel]);

  const stmtFilteredRows = useMemo(
    () => stmtRows.filter((r) => r.currency === stmtCurrency),
    [stmtRows, stmtCurrency]
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
        Generate a statement for {company.name} with date range and running balance. Dates default to the current month.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <div className="flex flex-col">
          <label htmlFor="stmt-scope" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Scope
          </label>
          <select
            id="stmt-scope"
            value={stmtScope}
            onChange={(e) => setStmtScope(e.target.value as 'company' | 'project')}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="company">Company (all projects)</option>
            <option value="project">Specific project</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-project" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Project
          </label>
          <select
            id="stmt-project"
            value={stmtProjectId ?? ''}
            onChange={(e) => setStmtProjectId(e.target.value ? Number(e.target.value) : null)}
            disabled={stmtScope !== 'project'}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
          >
            <option value="">Select project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-from" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            From date
          </label>
          <input
            id="stmt-from"
            type="date"
            value={stmtFromDate}
            onChange={(e) => setStmtFromDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-to" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            To date
          </label>
          <input
            id="stmt-to"
            type="date"
            value={stmtToDate}
            onChange={(e) => setStmtToDate(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="stmt-currency" className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
            Currency
          </label>
          <select
            id="stmt-currency"
            value={stmtCurrency}
            onChange={(e) => setStmtCurrency(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={generateStatement}
            disabled={stmtLoading || !ensureProjectScopeSelection()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stmtLoading ? 'Generating…' : 'Generate'}
          </button>
          {stmtGenerated && stmtFilteredRows.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadStatementPdf}
              className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Download PDF
            </button>
          )}
        </div>
      </div>

      {stmtGenerated && (
        <div className="mt-8 space-y-6">
          {/* Statement header */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/70 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              Statement of Account
            </h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 text-sm">
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Account </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">{company.name}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Period </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">
                  {stmtFromDate ? formatDate(stmtFromDate) : '—'} to {stmtToDate ? formatDate(stmtToDate) : '—'}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Currency </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">{stmtCurrency}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Scope </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">{scopeLabel}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-slate-500 dark:text-slate-400">Generated </dt>
                <dd className="inline text-slate-800 dark:text-slate-200">
                  {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Summary totals */}
          {stmtFilteredRows.length > 0 && (() => {
            const totalDebits = stmtFilteredRows.reduce((s, r) => s + r.debit, 0);
            const totalCredits = stmtFilteredRows.reduce((s, r) => s + r.credit, 0);
            const openingBalance = stmtFilteredRows.length > 0
              ? stmtFilteredRows[0].balance - stmtFilteredRows[0].debit + stmtFilteredRows[0].credit
              : 0;
            const closingBalance = stmtFilteredRows.length > 0
              ? stmtFilteredRows[stmtFilteredRows.length - 1].balance
              : 0;
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Opening balance
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(openingBalance, stmtCurrency)}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                    Total debits (invoices only)
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-amber-800 dark:text-amber-200">
                    {formatCurrency(totalDebits, stmtCurrency)}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Total credits (payments and credit notes)
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-emerald-800 dark:text-emerald-200">
                    {formatCurrency(totalCredits, stmtCurrency)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Closing balance
                  </p>
                  <p
                    className={`mt-0.5 text-base font-bold ${
                      closingBalance > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : closingBalance < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {formatCurrency(closingBalance, stmtCurrency)}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Transaction table */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Transaction history
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
              <table className="w-full text-sm text-left text-slate-800 dark:text-slate-200">
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
                  {stmtFilteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500 dark:text-slate-400">
                        No transactions in this currency for the selected period.
                      </td>
                    </tr>
                  ) : (
                    stmtFilteredRows.map((row, i) => (
                      <tr
                        key={`${row.date}-${row.type}-${row.reference}-${i}`}
                        className={i % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              row.type === 'invoice'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            }`}
                          >
                            {row.type === 'invoice'
                              ? 'Invoice'
                              : row.type === 'credit_note'
                                ? 'Credit note'
                                : 'Payment'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{row.reference}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '—'}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            row.balance > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : row.balance < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : ''
                          }`}
                        >
                          {formatCurrency(row.balance, row.currency)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyStatementsTab;
