import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LuPencil, LuCheck } from 'react-icons/lu';
import type { CreateQuotationDto, QuotationStatus, QuotationLine } from '../../types/quotation';
import type { Company } from '../../types/company';
import type { Project } from '../../types/project';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useCompanyStore } from '../../stores/data/CompanyStore';
import { useItemStore } from '../../stores/data/ItemStore';
import { useProjectStore } from '../../stores/data/ProjectStore';
import { useQuotationStore } from '../../stores/data/QuotationStore';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import AppText from '../text/AppText';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';
import LineItemsEditor, { type LineRow, lineTotal } from '../documents/LineItemsEditor';

const NO_PROJECT_ID = -1;
const NO_PROJECT_OPTION: Project = {
  id: NO_PROJECT_ID,
  company_id: 0,
  name: 'No project',
};

interface QuotationFormProps {
  quotationId?: number;
  initialCompanyId?: number;
  initialProjectId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QuotationForm({ quotationId, initialCompanyId, initialProjectId, onSuccess, onCancel }: QuotationFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(NO_PROJECT_OPTION);
  const [lineRows, setLineRows] = useState<LineRow[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [initialCompanyApplied, setInitialCompanyApplied] = useState(false);
  const [initialProjectApplied, setInitialProjectApplied] = useState(false);
  const [editingCompany, setEditingCompany] = useState(!initialCompanyId && !quotationId);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(!!initialProjectId);

  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const fetchItems = useItemStore((s) => s.fetchItems);
  const companies = useCompanyStore((s) => s.companies);
  const stockItems = useItemStore((s) => s.items);

  const [formData, setFormData] = useState<CreateQuotationDto>({
    company_id: undefined,
    project_id: undefined,
    quotation_number: '',
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_vat_number: '',
    delivery_address: '',
    delivery_conditions: '',
    order_number: '',
    terms: 'C.O.D',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    subtotal: 0,
    tax_rate: 15,
    tax_amount: 0,
    total: 0,
    currency: 'ZAR',
    notes: '',
  });

  useEffect(() => {
    void fetchCompanies();
    void fetchItems();
  }, [fetchCompanies, fetchItems]);

  const loadProjectsForCompany = useCallback(async (companyId: number) => {
    const projectList = await useProjectStore.getState().fetchProjectsForCompany(companyId);
    setProjects(projectList);
    return projectList;
  }, []);

  useEffect(() => {
    if (initialCompanyId && companies.length > 0 && !initialCompanyApplied && !quotationId) {
      const company = companies.find((c) => c.id === initialCompanyId);
      if (company) {
        setSelectedCompany(company);
        setFormData((prev) => ({
          ...prev,
          company_id: company.id,
          project_id: undefined,
          customer_name: company.name,
          customer_email: company.email ?? '',
          customer_address: company.address ?? '',
          customer_vat_number: company.vat_number ?? '',
          delivery_address: company.address ?? '',
        }));
        setSelectedProject(NO_PROJECT_OPTION);
        setInitialProjectApplied(false);
        loadProjectsForCompany(company.id!);
        setInitialCompanyApplied(true);
      }
    }
  }, [initialCompanyId, companies, initialCompanyApplied, quotationId, loadProjectsForCompany]);

  useEffect(() => {
    if (!quotationId && initialProjectId && projects.length > 0 && !initialProjectApplied) {
      const project = projects.find((p) => p.id === initialProjectId);
      if (project) {
        setSelectedProject(project);
        setFormData((prev) => ({ ...prev, project_id: project.id }));
        setInitialProjectApplied(true);
      }
    }
  }, [quotationId, initialProjectId, projects, initialProjectApplied]);

  useEffect(() => {
    if (!quotationId) {
      useQuotationStore
        .getState()
        .getNextQuotationNumber()
        .then((nextNumber) => {
          setFormData((prev) => ({ ...prev, quotation_number: nextNumber }));
        })
        .catch(() => {});
    }
  }, [quotationId]);

  useEffect(() => {
    if (quotationId) loadQuotation();
  }, [quotationId]);

  useEffect(() => {
    if (!quotationId || !formData.company_id || companies.length === 0 || selectedCompany) return;
    const matchedCompany = companies.find((c) => c.id === formData.company_id) ?? null;
    if (!matchedCompany) return;
    setSelectedCompany(matchedCompany);
    setFormData((prev) => ({
      ...prev,
      delivery_address: prev.delivery_address || matchedCompany.address || '',
    }));
    loadProjectsForCompany(matchedCompany.id!).then((projectList) => {
      if (formData.project_id == null) return;
      const matchedProject = projectList.find((p) => p.id === formData.project_id) ?? null;
      setSelectedProject(matchedProject);
    }).catch(() => {});
  }, [quotationId, formData.company_id, formData.project_id, companies, selectedCompany, loadProjectsForCompany]);

  const loadQuotation = async () => {
    if (!quotationId) return;
    try {
      setLoading(true);
      const { quotation, lines: items } = await useQuotationStore
        .getState()
        .fetchQuotationWithLines(quotationId);
      if (quotation) {
        if (quotation.status === 'converted') {
          const from = searchParams.get('from_company');
          navigate(`/app/quotations/${quotationId}${from ? `?from_company=${from}` : ''}`, { replace: true });
          return;
        }
        const matchedCompany = quotation.company_id != null
          ? companies.find((c) => c.id === quotation.company_id) ?? null
          : null;
        setFormData({
          company_id: quotation.company_id,
          project_id: quotation.project_id,
          quotation_number: quotation.quotation_number,
          customer_name: quotation.customer_name,
          customer_email: quotation.customer_email || '',
          customer_address: quotation.customer_address || '',
          customer_vat_number: quotation.customer_vat_number || '',
          delivery_address: quotation.delivery_address || matchedCompany?.address || '',
          delivery_conditions: quotation.delivery_conditions || '',
          order_number: quotation.order_number || '',
          terms: quotation.terms || 'C.O.D',
          issue_date: quotation.issue_date.split('T')[0],
          valid_until: quotation.valid_until ? quotation.valid_until.split('T')[0] : '',
          status: quotation.status,
          subtotal: quotation.subtotal,
          tax_rate: quotation.tax_rate || 0,
          tax_amount: quotation.tax_amount || 0,
          total: quotation.total,
          currency: quotation.currency || 'ZAR',
          notes: quotation.notes || '',
        });
        setSelectedCompany(matchedCompany);
        if (matchedCompany?.id) {
          const projectList = await loadProjectsForCompany(matchedCompany.id);
          if (quotation.project_id != null) {
            const matchedProject = projectList.find((p) => p.id === quotation.project_id) ?? null;
            setSelectedProject(matchedProject);
          } else {
            setSelectedProject(NO_PROJECT_OPTION);
          }
        } else if (quotation.project_id != null) {
          const project = await useProjectStore.getState().findProjectById(quotation.project_id);
          setSelectedProject(project);
        } else {
          setSelectedProject(NO_PROJECT_OPTION);
        }
        const rows: LineRow[] = (items || []).map((item) => ({
          id: `line-${item.id ?? Math.random()}`,
          sku: item.sku || '',
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          discountPercent: Number(item.discount_percent ?? 0),
          unit_type: item.unit_type ?? 'qty',
        }));
        setLineRows(rows);
        setGlobalDiscountPercent(Number(quotation.discount_percent ?? 0));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const linesSubtotal = lineRows.reduce((sum, row) => sum + lineTotal(row), 0);
    const discountAmount = (linesSubtotal * globalDiscountPercent) / 100;
    const subtotalAfterDiscount = linesSubtotal - discountAmount;
    const taxRate = formData.tax_rate ?? 0;
    const taxAmount = (subtotalAfterDiscount * taxRate) / 100;
    const total = subtotalAfterDiscount + taxAmount;
    return { linesSubtotal, discountAmount, subtotalAfterDiscount, taxAmount, total };
  }, [lineRows, globalDiscountPercent, formData.tax_rate]);

  const projectOptions = useMemo(() => [NO_PROJECT_OPTION, ...projects], [projects]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subtotal: totals.subtotalAfterDiscount,
      tax_amount: totals.taxAmount,
      total: totals.total,
    }));
  }, [totals.subtotalAfterDiscount, totals.taxAmount, totals.total]);

  const handleChange = useCallback((field: keyof CreateQuotationDto, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleCompanySelect = useCallback((company: Company) => {
    setSelectedCompany(company);
    setFormData((prev) => ({
      ...prev,
      company_id: company.id,
      project_id: undefined,
      customer_name: company.name,
      customer_email: company.email || '',
      customer_address: company.address || '',
      customer_vat_number: company.vat_number || '',
      delivery_address: prev.delivery_address || company.address || '',
    }));
    setSelectedProject(NO_PROJECT_OPTION);
    if (company.id != null) {
      loadProjectsForCompany(company.id).catch(() => setProjects([]));
    }
  }, [loadProjectsForCompany]);

  const handleCompanyClear = useCallback(() => {
    setSelectedCompany(null);
    setSelectedProject(NO_PROJECT_OPTION);
    setProjects([]);
    setFormData((prev) => ({
      ...prev,
      company_id: undefined,
      project_id: undefined,
      customer_name: '',
      customer_email: '',
      customer_address: '',
      customer_vat_number: '',
      delivery_address: '',
    }));
  }, []);

  const handleProjectSelect = useCallback((project: Project) => {
    if (project.id === NO_PROJECT_ID) {
      setSelectedProject(NO_PROJECT_OPTION);
      setFormData((prev) => ({ ...prev, project_id: undefined }));
      return;
    }
    setSelectedProject(project);
    setFormData((prev) => ({ ...prev, project_id: project.id }));
  }, []);

  const handleProjectClear = useCallback(() => {
    setSelectedProject(NO_PROJECT_OPTION);
    setFormData((prev) => ({ ...prev, project_id: undefined }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.quotation_number || !formData.customer_name) {
      setError('Quotation number and company are required');
      return;
    }
    const items: Omit<QuotationLine, 'id' | 'quotation_id'>[] = lineRows
      .filter((r) => r.description && r.quantity > 0)
      .map((r) => ({
        sku: r.sku || undefined,
        description: r.description,
        quantity: r.quantity,
        unit_price: r.unit_price,
        discount_percent: r.discountPercent || 0,
        total: lineTotal(r),
        unit_type: r.unit_type,
      }));
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const payload: CreateQuotationDto = {
      ...formData,
      discount_percent: globalDiscountPercent || 0,
      ...(businessId != null && { business_id: businessId }),
      items: items.length ? items : undefined,
    };
    try {
      setLoading(true);
      await useQuotationStore.getState().saveQuotationWithLines({
        quotationId,
        payload,
        lines: items,
      });
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  // Shared input + label styles aligned with the app design system
  const inputClass =
    'w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
  const labelClass = 'mb-0.5 text-xs font-medium text-slate-400 dark:text-slate-500';
  const groupClass = 'flex flex-col';

  if (loading && quotationId) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-3">
        <AppText variant="caption">Loading quotation…</AppText>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Page title row */}
      <div className="flex items-center gap-2 mb-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <AppText variant="h3">
          {quotationId ? 'Edit Quotation' : 'Create Quotation'}
        </AppText>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <AppText variant="caption" className="text-red-700 dark:text-red-300">{error}</AppText>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700"
      >
        {/* ── Header fields ── */}
        <div className="p-3">
          <AppText variant="caption" className="uppercase tracking-wider font-semibold mb-2 block">
            Document
          </AppText>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <div className={groupClass}>
              <label htmlFor="quotation_number" className={labelClass}>Quotation #</label>
              <input
                id="quotation_number"
                type="text"
                value={formData.quotation_number}
                onChange={(e) => handleChange('quotation_number', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className={groupClass}>
              <label htmlFor="order_number" className={labelClass}>Order #</label>
              <input
                id="order_number"
                type="text"
                value={formData.order_number || ''}
                onChange={(e) => handleChange('order_number', e.target.value)}
                className={inputClass}
                placeholder="PO number"
              />
            </div>
            <div className={groupClass}>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as QuotationStatus)}
                className={inputClass}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
            </div>
            <div className={groupClass}>
              <label htmlFor="currency" className={labelClass}>Currency</label>
              <select
                id="currency"
                value={formData.currency || 'ZAR'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className={inputClass}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className={groupClass}>
              <label htmlFor="issue_date" className={labelClass}>Issue Date</label>
              <input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => handleChange('issue_date', e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className={groupClass}>
              <label htmlFor="valid_until" className={labelClass}>Valid Until</label>
              <input
                id="valid_until"
                type="date"
                value={formData.valid_until || ''}
                onChange={(e) => handleChange('valid_until', e.target.value || undefined)}
                className={inputClass}
              />
            </div>
            <div className={groupClass}>
              <label htmlFor="terms" className={labelClass}>Terms</label>
              <select
                id="terms"
                value={formData.terms || ''}
                onChange={(e) => handleChange('terms', e.target.value)}
                className={inputClass}
              >
                <option value="">Select terms…</option>
                <option value="C.O.D">C.O.D (Cash on Delivery)</option>
                <option value="Net 7">Net 7 Days</option>
                <option value="Net 14">Net 14 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>
            <div className={groupClass}>
              <label htmlFor="delivery_conditions" className={labelClass}>Delivery</label>
              <select
                id="delivery_conditions"
                value={formData.delivery_conditions || ''}
                onChange={(e) => handleChange('delivery_conditions', e.target.value)}
                className={inputClass}
              >
                <option value="">Select…</option>
                <option value="collect">Collect</option>
                <option value="deliver">Deliver</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Company ── */}
        <div className="p-3">
          <AppText variant="caption" className="uppercase tracking-wider font-semibold mb-2 block">
            Company
          </AppText>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

            {/* Left: company identity */}
            <div className="space-y-1.5">
              {editingCompany ? (
                <>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <AppLabledAutocomplete
                        label="Company *"
                        options={companies}
                        value={selectedCompany?.id != null ? String(selectedCompany.id) : ''}
                        displayValue={selectedCompany?.name ?? formData.customer_name}
                        accessor="name"
                        valueAccessor="id"
                        onSelect={handleCompanySelect}
                        onClear={handleCompanyClear}
                        required
                        placeholder="Search company…"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingCompany(false)}
                      className="mt-5 p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      title="Done"
                    >
                      <LuCheck size={14} />
                    </button>
                  </div>
                  <div className={groupClass}>
                    <label htmlFor="customer_vat_number" className={labelClass}>Company VAT #</label>
                    <input
                      id="customer_vat_number"
                      type="text"
                      value={formData.customer_vat_number || ''}
                      onChange={(e) => handleChange('customer_vat_number', e.target.value)}
                      className={inputClass}
                      placeholder="VAT number"
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-2 group">
                  <div className="flex-1 min-w-0">
                    {formData.customer_name ? (
                      <>
                        <AppText variant="body" className="font-medium">{formData.customer_name}</AppText>
                        {formData.customer_email && <AppText variant="caption">{formData.customer_email}</AppText>}
                        {formData.customer_address && <AppText variant="caption">{formData.customer_address}</AppText>}
                        {formData.customer_vat_number && (
                          <AppText variant="caption">VAT: {formData.customer_vat_number}</AppText>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingCompany(true)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        + Select a company
                      </button>
                    )}
                  </div>
                  {formData.customer_name && (
                    <button
                      type="button"
                      onClick={() => setEditingCompany(true)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit company"
                    >
                      <LuPencil size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Project picker */}
              {showProjectPicker ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <AppLabledAutocomplete
                      label="Project"
                      options={projectOptions}
                      value={selectedProject?.id != null ? String(selectedProject.id) : String(NO_PROJECT_ID)}
                      displayValue={selectedProject?.name ?? 'No project'}
                      accessor="name"
                      valueAccessor="id"
                      onSelect={handleProjectSelect}
                      onClear={handleProjectClear}
                      disabled={!selectedCompany}
                      placeholder="Search project…"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProjectPicker(false)}
                    className="mt-5 p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                    title="Done"
                  >
                    <LuCheck size={14} />
                  </button>
                </div>
              ) : (
                <div>
                  {selectedProject && selectedProject.id !== NO_PROJECT_ID ? (
                    <div className="flex items-center gap-2 group">
                      <AppText variant="caption" className="text-indigo-600 dark:text-indigo-400">
                        Project: {selectedProject.name}
                      </AppText>
                      <button
                        type="button"
                        onClick={() => setShowProjectPicker(true)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Change project"
                      >
                        <LuPencil size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { if (selectedCompany) setShowProjectPicker(true); }}
                      className={`text-xs transition-colors ${
                        selectedCompany
                          ? 'text-indigo-600 dark:text-indigo-400 hover:underline'
                          : 'text-slate-400 dark:text-slate-500 cursor-default'
                      }`}
                    >
                      + Base quote on a project
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: delivery address */}
            <div>
              {editingDelivery ? (
                <div className={groupClass}>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="delivery_address" className={labelClass}>Delivery address</label>
                    <button
                      type="button"
                      onClick={() => setEditingDelivery(false)}
                      className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                      title="Done"
                    >
                      <LuCheck size={13} />
                    </button>
                  </div>
                  <textarea
                    id="delivery_address"
                    value={formData.delivery_address || ''}
                    onChange={(e) => handleChange('delivery_address', e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-y`}
                    placeholder="Delivery address"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-start gap-2 group">
                  <div className="flex-1 min-w-0">
                    <p className={`${labelClass} mb-0.5`}>Delivery address</p>
                    {formData.delivery_address ? (
                      <AppText variant="caption" className="whitespace-pre-wrap">{formData.delivery_address}</AppText>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingDelivery(true)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        + Add delivery address
                      </button>
                    )}
                  </div>
                  {formData.delivery_address && (
                    <button
                      type="button"
                      onClick={() => setEditingDelivery(true)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Edit delivery address"
                    >
                      <LuPencil size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Line items ── */}
        <div className="p-3">
          <AppText variant="caption" className="uppercase tracking-wider font-semibold mb-2 block">
            Line items
          </AppText>
          <LineItemsEditor
            rows={lineRows}
            stockItems={stockItems}
            currency={formData.currency || 'ZAR'}
            onChange={setLineRows}
          />
        </div>

        {/* ── Totals ── */}
        <div className="p-3">
          <AppText variant="caption" className="uppercase tracking-wider font-semibold mb-2 block">
            Totals
          </AppText>
          <div className="flex justify-end">
            <div className="w-full max-w-sm rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-3">
                <AppText variant="caption">Subtotal</AppText>
                <AppText variant="caption">{formatCurrency(totals.linesSubtotal, formData.currency)}</AppText>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  Discount
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={100}
                    value={globalDiscountPercent || ''}
                    onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-400"
                    placeholder="0"
                  />
                  <span>%</span>
                </label>
                <AppText variant="caption">
                  {globalDiscountPercent > 0 ? `−${formatCurrency(totals.discountAmount, formData.currency)}` : '—'}
                </AppText>
              </div>
              {globalDiscountPercent > 0 && (
                <div className="flex items-center justify-between gap-3">
                  <AppText variant="caption">After discount</AppText>
                  <AppText variant="caption">{formatCurrency(totals.subtotalAfterDiscount, formData.currency)}</AppText>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 shrink-0">
                  Tax
                  <input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.tax_rate || ''}
                    onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-400"
                    placeholder="0"
                  />
                  <span>%</span>
                </label>
                <AppText variant="caption">{formatCurrency(totals.taxAmount, formData.currency)}</AppText>
              </div>
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                <AppText variant="body" className="font-semibold">Total</AppText>
                <AppText variant="body" className="font-semibold">{formatCurrency(totals.total, formData.currency)}</AppText>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="p-3">
          <AppText variant="caption" className="uppercase tracking-wider font-semibold mb-2 block">
            Notes
          </AppText>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex flex-col-reverse gap-2 px-3 py-2.5 sm:flex-row sm:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-4 py-1.5 text-sm font-medium rounded-lg transition-colors sm:w-auto border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : quotationId ? 'Update Quotation' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
