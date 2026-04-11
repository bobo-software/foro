import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CompanyService from '@/services/companyService';
import InvoiceService from '@/services/invoiceService';
import QuotationService from '@/services/quotationService';
import PaymentService from '@/services/paymentService';
import ProjectService from '@/services/projectService';
import type { Company } from '@/types/company';
import type { Invoice } from '@/types/invoice';
import type { Quotation } from '@/types/quotation';
import type { Payment } from '@/types/payment';
import type { Project } from '@/types/project';
import {
  CompanySummaryTab,
  CompanyQuotationsTab,
  CompanyInvoicesTab,
  CompanyPaymentsTab,
  CompanyStatementsTab,
  CompanyEditTab,
  CompanyContactsTab,
} from './tabs';
import { AppPageHeader } from '@/components/ComponentsIndex';
import type { ProjectScope } from './tabs/types';
import { useBusinessStore } from '@/stores/data/BusinessStore';

type TabId = 'summary' | 'contacts' | 'quotations' | 'invoices' | 'payments' | 'statements' | 'edit';

export function CompanyDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentBusinessId = useBusinessStore((s) => s.currentBusiness?.id);
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectScope>('all');
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docsRefreshTick, setDocsRefreshTick] = useState(0);
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam ?? 'summary');

  const loadProjects = useCallback(async (companyId: number) => {
    const where: Record<string, unknown> = { company_id: companyId };
    if (currentBusinessId != null) where.business_id = currentBusinessId;
    const data = await ProjectService.findAll({
      where,
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    });
    setProjects(data);
    return data;
  }, [currentBusinessId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    CompanyService.findById(Number(id))
      .then((data) => {
        if (!cancelled) setCompany(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load company');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!company?.id) return;
    let cancelled = false;
    loadProjects(company.id)
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [company?.id, loadProjects]);

  useEffect(() => {
    if (!company?.name) return;
    let cancelled = false;
    setDocsLoading(true);
    const invoiceWhere: Record<string, unknown> = { customer_name: company.name };
    const quotationWhere: Record<string, unknown> = { customer_name: company.name };
    const paymentOptions = selectedProjectId !== 'all'
      ? { projectId: selectedProjectId }
      : undefined;
    if (selectedProjectId !== 'all') {
      invoiceWhere.project_id = selectedProjectId;
      quotationWhere.project_id = selectedProjectId;
    }
    Promise.all([
      InvoiceService.findAll({
        where: invoiceWhere,
        orderBy: 'issue_date',
        orderDirection: 'DESC',
        limit: 200,
      }),
      QuotationService.findAll({
        where: quotationWhere,
        limit: 200,
      }).catch(() => [] as Quotation[]),
      PaymentService.findByCompany(company.name, paymentOptions).catch(() => [] as Payment[]),
    ])
      .then(([inv, quot, pay]) => {
        if (!cancelled) {
          setInvoices(inv);
          setQuotations(quot);
          setPayments(Array.isArray(pay) ? pay : []);
        }
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company?.name, selectedProjectId, docsRefreshTick]);

  useEffect(() => {
    if (selectedProjectId === 'all') return;
    const exists = projects.some((p) => p.id === selectedProjectId);
    if (!exists) setSelectedProjectId('all');
  }, [projects, selectedProjectId]);

  const tabButtons = useMemo(
    () => [
      { id: 'summary' as TabId, label: 'Summary' },
      { id: 'contacts' as TabId, label: 'Contacts' },
      { id: 'quotations' as TabId, label: 'Quotations' },
      { id: 'invoices' as TabId, label: 'Invoices' },
      { id: 'payments' as TabId, label: 'Payments' },
      { id: 'statements' as TabId, label: 'Statements' },
      { id: 'edit' as TabId, label: 'Edit' },
    ],
    []
  );

  const handleCompanyUpdate = (updated: Company) => {
    setCompany(updated);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    );
  }
  if (error || !company) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Company not found.'}</p>
        <Link
          to="/app/companies"
          className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline"
        >
          Back to companies
        </Link>
      </div>
    );
  }

  const tabProps = {
    company,
    projects,
    selectedProjectId,
    invoices,
    quotations,
    payments,
    docsLoading,
    onCompanyUpdate: handleCompanyUpdate,
  };

  return (
    <div className="space-y-3">
      <AppPageHeader
        title={company.name}
        subtitle="Company details"
        showBackButton={true}
        onBackClick={() => navigate(-1)}
      />

      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-0.5 flex-wrap" aria-label="Tabs">
          {tabButtons.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2 pb-1.5">
          <select
            id="project-scope"
            value={selectedProjectId === 'all' ? 'all' : String(selectedProjectId)}
            onChange={(e) => {
              if (e.target.value === 'all') {
                setSelectedProjectId('all');
                return;
              }
              setSelectedProjectId(Number(e.target.value));
            }}
            className="rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <Link
            to={`/app/companies/${company.id}/projects`}
            className="px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 no-underline transition-colors"
          >
            Manage
          </Link>
        </div>
      </div>

      {activeTab === 'summary' && <CompanySummaryTab {...tabProps} />}
      {activeTab === 'contacts' && <CompanyContactsTab company={company} />}
      {activeTab === 'quotations' && <CompanyQuotationsTab {...tabProps} />}
      {activeTab === 'invoices' && (
        <CompanyInvoicesTab {...tabProps} onRefresh={() => setDocsRefreshTick((t) => t + 1)} />
      )}
      {activeTab === 'payments' && <CompanyPaymentsTab {...tabProps} onRefresh={() => setDocsRefreshTick((t) => t + 1)} />}
      {activeTab === 'statements' && <CompanyStatementsTab {...tabProps} />}
      {activeTab === 'edit' && <CompanyEditTab company={company} onCompanyUpdate={handleCompanyUpdate} />}
    </div>
  );
}
