import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFilter, LuUsers } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useAutoRefresh, useProjectId } from '@/hooks';
import type { Company } from '@/types/company';

const companyColumns: AppDataTableColumn<Company>[] = [
  {
    id: 'name',
    header: 'Name',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (c) => c.name,
  },
  {
    id: 'email',
    header: 'Email',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.email ?? '—',
  },
  {
    id: 'phone',
    header: 'Phone',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.phone ?? '—',
  },
  {
    id: 'tax_id',
    header: 'Tax ID',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.tax_id ?? '—',
  },
];

export function CompaniesPage() {
  const navigate = useNavigate();
  const { companies, loading, error, fetchCompanies } = useCompanyStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const projectId = useProjectId();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies, businessId]);

  useAutoRefresh(projectId, 'companies', fetchCompanies);

  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.trim().toLowerCase();
    return companies.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.tax_id?.toLowerCase().includes(q),
    );
  }, [companies, search]);

  const companiesEmptyMessage = search.trim() ? 'No companies match your search.' : 'No companies yet.';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Companies</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your companies</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading companies…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Companies</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your companies</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search companies"
          />
        </div>
        <Link
          to="/app/companies/create"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          + Add company
        </Link>
      </div>

      <AppDataTable<Company>
        title="Companies"
        titleIcon={<LuUsers />}
        columns={companyColumns}
        data={filteredCompanies}
        getRowKey={(row, index) => row.id ?? `company-${index}`}
        onRowClick={(c) => {
          if (c.id != null) navigate(`/app/companies/${c.id}`);
        }}
        error={error}
        emptyMessage={companiesEmptyMessage}
      />
    </div>
  );
}
