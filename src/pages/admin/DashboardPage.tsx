import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import InvoiceService from '@/services/invoiceService';
import CompanyService from '@/services/companyService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import QuotationService from '@/services/quotationService';
import ItemService from '@/services/itemService';
import BankingDetailsService from '@/services/bankingDetailsService';
import type { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/utils/currency';
import {
  LuUsers,
  LuFileText,
  LuPackage,
  LuQuote,
  LuTrendingUp,
} from 'react-icons/lu';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  to?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, to, loading }: StatCardProps) {
  const content = (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5 flex items-start gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 shrink-0 [&>svg]:w-5 [&>svg]:h-5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
          {loading ? '—' : value}
        </p>
      </div>
    </div>
  );
  if (to) {
    return (
      <Link to={to} className="block no-underline text-inherit">
        {content}
      </Link>
    );
  }
  return content;
}

export function DashboardPage() {
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessLoading = useBusinessStore((s) => s.loading);
  const businesses = useBusinessStore((s) => s.businesses);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    companies: 0,
    invoices: 0,
    quotations: 0,
    items: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [hasBankingDetails, setHasBankingDetails] = useState(false);
  const [bankingLoading, setBankingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const businessWhere = businessId != null ? { business_id: businessId } : undefined;
        const [companies, invoices, quotations, items, recent] = await Promise.all([
          CompanyService.count(businessWhere),
          InvoiceService.count(),
          QuotationService.count(),
          ItemService.count(businessWhere),
          InvoiceService.findAll({
            orderBy: 'issue_date',
            orderDirection: 'DESC',
            limit: 5,
          }),
        ]);
        if (!cancelled) {
          setStats({ companies, invoices, quotations, items });
          setRecentInvoices(recent);
        }
      } catch (e) {
        if (!cancelled) {
          setRecentError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  useEffect(() => {
    let cancelled = false;
    const userId = currentBusiness?.user_id;
    if (!userId) {
      setHasBankingDetails(false);
      setBankingLoading(false);
      return;
    }

    setBankingLoading(true);
    BankingDetailsService.findByUserId(Number(userId))
      .then((rows) => {
        if (!cancelled) setHasBankingDetails(rows.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasBankingDetails(false);
      })
      .finally(() => {
        if (!cancelled) setBankingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.user_id]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Dashboard</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Overview of your CRM and sales activity.</p>
      </div>

      {!businessLoading && businesses.length === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">Company setup required</p>
          <p className="mt-1">
            You have not registered your company yet.{' '}
            <Link to="/onboard" className="font-medium underline text-amber-900 dark:text-amber-100">
              Register your company
            </Link>{' '}
            to start using settings and documents.
          </p>
        </div>
      )}

      {!businessLoading && !!currentBusiness && !bankingLoading && !hasBankingDetails && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <p className="font-medium">Banking details missing</p>
          <p className="mt-1">
            Add your banking details so customers can pay you from invoices and documents.{' '}
            <Link
              to="/app/settings/banking"
              className="font-medium underline text-amber-900 dark:text-amber-100"
            >
              Open banking settings
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Companies"
          value={stats.companies}
          icon={<LuUsers className="w-5 h-5" />}
          to="/app/companies"
          loading={loading}
        />
        <StatCard
          title="Invoices"
          value={stats.invoices}
          icon={<LuFileText className="w-5 h-5" />}
          loading={loading}
        />
        <StatCard
          title="Quotations"
          value={stats.quotations}
          icon={<LuQuote className="w-5 h-5" />}
          to="/app/quotations"
          loading={loading}
        />
        <StatCard
          title="Stock (Items)"
          value={stats.items}
          icon={<LuPackage className="w-5 h-5" />}
          to="/app/items"
          loading={loading}
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <LuTrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Recent Invoices
          </h2>
        </div>
        <div className="overflow-x-auto">
          {recentError && (
            <div className="p-4 text-sm text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
              {recentError}
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading…</div>
          ) : recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">No invoices yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-slate-600 dark:text-slate-300 font-medium">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Company</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{inv.invoice_number}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{inv.customer_name}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800 dark:text-slate-100">
                      {formatCurrency(inv.total, inv.currency)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/app/invoices/${inv.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 font-medium no-underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
