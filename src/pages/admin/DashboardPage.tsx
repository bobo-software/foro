import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppText from '@/components/text/AppText';
import { RecentInvoicesTable } from '@/components/elements/RecentInvoicesTable';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useDashboardStore } from '@/stores/data/DashboardStore';
import {
  LuUsers,
  LuFileText,
  LuPackage,
  LuQuote,
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm px-3 py-2.5 flex items-center gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="p-1.5 rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 shrink-0 [&>svg]:w-4 [&>svg]:h-4">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <AppText variant="label" className="text-xs" text={title} />
        <AppText variant="value" className="text-lg leading-tight">{loading ? '—' : value}</AppText>
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
  const stats = useDashboardStore((s) => s.stats);
  const recentInvoices = useDashboardStore((s) => s.recentInvoices);
  const loading = useDashboardStore((s) => s.loading);
  const recentError = useDashboardStore((s) => s.error);
  const hasBankingDetails = useDashboardStore((s) => s.hasBankingDetails);
  const bankingLoading = useDashboardStore((s) => s.bankingLoading);
  const loadSnapshot = useDashboardStore((s) => s.loadSnapshot);
  const loadBankingPresence = useDashboardStore((s) => s.loadBankingPresence);

  useEffect(() => {
    void loadSnapshot(businessId);
  }, [businessId, loadSnapshot]);

  useEffect(() => {
    void loadBankingPresence(currentBusiness?.user_id ?? undefined);
  }, [currentBusiness?.user_id, loadBankingPresence]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col items-baseline">
        <AppText variant="h1" className="text-xl" text="Dashboard"  />
        <AppText variant="subtitle" className="text-xs" text="Overview of your CRM and sales activity." />
      </div>

      {!businessLoading && businesses.length === 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
          <AppText variant="label" className="text-xs text-amber-800 dark:text-amber-200 font-semibold" text="Company setup required" />
          <AppText variant="body" className="text-xs text-amber-800 dark:text-amber-200">
            You have not registered your company yet.{' '}
            <Link to="/onboard" className="font-medium underline text-amber-900 dark:text-amber-100">
              Register your company
            </Link>{' '}
            to start using settings and documents.
          </AppText>
        </div>
      )}

      {!businessLoading && !!currentBusiness && !bankingLoading && !hasBankingDetails && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
          <AppText variant="label" className="text-xs text-amber-800 dark:text-amber-200 font-semibold" text="Banking details missing" />
          <AppText variant="body" className="text-xs text-amber-800 dark:text-amber-200">
            Add your banking details so customers can pay you.{' '}
            <Link
              to="/app/settings/banking"
              className="font-medium underline text-amber-900 dark:text-amber-100"
            >
              Open banking settings
            </Link>
            .
          </AppText>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard
          title="Companies"
          value={stats.companies}
          icon={<LuUsers />}
          to="/app/companies"
          loading={loading}
        />
        <StatCard
          title="Invoices"
          value={stats.invoices}
          icon={<LuFileText />}
          loading={loading}
        />
        <StatCard
          title="Quotations"
          value={stats.quotations}
          icon={<LuQuote />}
          to="/app/quotations"
          loading={loading}
        />
        <StatCard
          title="Stock Items"
          value={stats.items}
          icon={<LuPackage />}
          to="/app/items"
          loading={loading}
        />
      </div>

      <RecentInvoicesTable
        invoices={recentInvoices}
        loading={loading}
        error={recentError}
      />
    </div>
  );
}
