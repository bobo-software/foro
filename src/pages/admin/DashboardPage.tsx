import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppText from '@/components/text/AppText';
import { AppModal } from '@/components/modals/AppModal';
import { RecentInvoicesTable } from '@/components/elements/RecentInvoicesTable';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useDashboardStore } from '@/stores/data/DashboardStore';
import { formatCurrency } from '@/utils/currency';
import type { Company } from '@/types/company';
import {
  LuUsers,
  LuFileText,
  LuPackage,
  LuQuote,
  LuCircleCheck,
  LuClock,
  LuCircleAlert,
  LuWallet,
  LuFileX2,
  LuSearch,
  LuBuilding2,
  LuZap,
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

interface FinancialCardProps {
  title: string;
  amount: number;
  icon: React.ReactNode;
  iconColor: string;
  loading?: boolean;
}

function FinancialCard({ title, amount, icon, iconColor, loading }: FinancialCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm px-3 py-3 flex items-center gap-3">
      <div className={`p-1.5 rounded-md shrink-0 [&>svg]:w-4 [&>svg]:h-4 ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <AppText variant="label" className="text-xs" text={title} />
        <AppText variant="value" className="text-base leading-tight font-semibold">
          {loading ? '—' : formatCurrency(amount)}
        </AppText>
      </div>
    </div>
  );
}

// ── Quick-action definitions ──────────────────────────────────────────────────

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  buildPath: (companyId?: number) => string;
  accentCls: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'New Invoice',
    icon: <LuFileText size={15} />,
    buildPath: (id) => `/app/invoices/create${id ? `?company_id=${id}` : ''}`,
    accentCls: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700 dark:hover:bg-indigo-900/40',
  },
  {
    label: 'New Quotation',
    icon: <LuQuote size={15} />,
    buildPath: (id) => `/app/quotations/create${id ? `?company_id=${id}` : ''}`,
    accentCls: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700 dark:hover:bg-violet-900/40',
  },
  {
    label: 'New Credit Note',
    icon: <LuFileX2 size={15} />,
    buildPath: (id) => `/app/invoices/create?credit_note=1${id ? `&company_id=${id}` : ''}`,
    accentCls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/40',
  },
  {
    label: 'New Payment',
    icon: <LuWallet size={15} />,
    buildPath: () => '/app/payments/create',
    accentCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-900/40',
  },
];

// ── Company picker modal ───────────────────────────────────────────────────────

interface CompanyPickerModalProps {
  isOpen: boolean;
  action: QuickAction | null;
  companies: Company[];
  onClose: () => void;
  onPick: (action: QuickAction, company?: Company) => void;
}

function CompanyPickerModal({ isOpen, action, companies, onClose, onPick }: CompanyPickerModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q),
    );
  }, [companies, search]);

  if (!action) return null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={action.label}
      titleIcon={action.icon}
      size="sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={() => onPick(action)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline underline-offset-2 transition-colors"
          >
            Skip — no company
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">Select a company to pre-fill the form.</p>
        {/* Search */}
        <div className="relative">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            autoFocus
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 py-1.5 pl-8 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {/* Company list */}
        <div className="max-h-56 overflow-y-auto -mx-1 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">No companies found.</p>
          ) : (
            filtered.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => onPick(action, company)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group"
              >
                <div className="shrink-0 w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 group-hover:bg-slate-200 dark:group-hover:bg-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors">
                  <LuBuilding2 size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{company.name}</p>
                  {company.email && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{company.email}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </AppModal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const businessLoading = useBusinessStore((s) => s.loading);
  const businesses = useBusinessStore((s) => s.businesses);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const { companies, fetchCompanies } = useCompanyStore();
  const stats = useDashboardStore((s) => s.stats);
  const financials = useDashboardStore((s) => s.financials);
  const recentInvoices = useDashboardStore((s) => s.recentInvoices);
  const loading = useDashboardStore((s) => s.loading);
  const recentError = useDashboardStore((s) => s.error);
  const hasBankingDetails = useDashboardStore((s) => s.hasBankingDetails);
  const bankingLoading = useDashboardStore((s) => s.bankingLoading);
  const loadSnapshot = useDashboardStore((s) => s.loadSnapshot);
  const loadBankingPresence = useDashboardStore((s) => s.loadBankingPresence);

  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);

  useEffect(() => {
    void loadSnapshot(businessId);
  }, [businessId, loadSnapshot]);

  useEffect(() => {
    void loadBankingPresence(currentBusiness?.user_id ?? undefined);
  }, [currentBusiness?.user_id, loadBankingPresence]);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies, businessId]);

  const handleActionClick = (action: QuickAction) => {
    if (companies.length === 0) {
      navigate(action.buildPath());
    } else {
      setPendingAction(action);
    }
  };

  const handlePick = (action: QuickAction, company?: Company) => {
    setPendingAction(null);
    navigate(action.buildPath(company?.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <AppText variant="h1" className="text-xl" text="Dashboard" />
          <AppText variant="subtitle" className="text-xs" text="Overview of your CRM and sales activity." />
        </div>
        {/* Quick actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
            <LuZap size={11} />Quick actions
          </span>
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => handleActionClick(action)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${action.accentCls}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <CompanyPickerModal
        isOpen={pendingAction !== null}
        action={pendingAction}
        companies={companies}
        onClose={() => setPendingAction(null)}
        onPick={handlePick}
      />

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
          to="/app/documents/invoices"
          loading={loading}
        />
        <StatCard
          title="Quotations"
          value={stats.quotations}
          icon={<LuQuote />}
          to="/app/documents/quotations"
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

      <div className="space-y-1.5">
        <AppText variant="label" className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide" text="Overall Statements" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <FinancialCard
            title="Total Billed"
            amount={financials.totalBilled}
            icon={<LuWallet />}
            iconColor="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300"
            loading={loading}
          />
          <FinancialCard
            title="Total Paid"
            amount={financials.totalPaid}
            icon={<LuCircleCheck />}
            iconColor="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300"
            loading={loading}
          />
          <FinancialCard
            title="Outstanding"
            amount={financials.outstanding}
            icon={<LuClock />}
            iconColor="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300"
            loading={loading}
          />
          <FinancialCard
            title="Overdue"
            amount={financials.overdue}
            icon={<LuCircleAlert />}
            iconColor="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300"
            loading={loading}
          />
        </div>
      </div>

      <RecentInvoicesTable
        invoices={recentInvoices}
        loading={loading}
        error={recentError}
      />
    </div>
  );
}
