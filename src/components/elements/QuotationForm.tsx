import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CreateQuotationDto, QuotationStatus, QuotationLine } from '../../types/quotation';
import type { Company } from '../../types/company';
import type { Item } from '../../types/item';
import type { Project } from '../../types/project';
import QuotationService from '../../services/quotationService';
import QuotationLineService from '../../services/quotationLineService';
import CompanyService from '../../services/companyService';
import ItemService from '../../services/itemService';
import ProjectService from '../../services/projectService';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';
import LineItemsEditor, { type LineRow, lineTotal } from '../documents/LineItemsEditor';

interface QuotationFormProps {
  quotationId?: number;
  initialCompanyId?: number;
  initialProjectId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}


export function QuotationForm({ quotationId, initialCompanyId, initialProjectId, onSuccess, onCancel }: QuotationFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stockItems, setStockItems] = useState<Item[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [lineRows, setLineRows] = useState<LineRow[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [initialCompanyApplied, setInitialCompanyApplied] = useState(false);
  const [initialProjectApplied, setInitialProjectApplied] = useState(false);

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
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const itemWhere = businessId != null ? { business_id: businessId } : undefined;
    Promise.all([
      CompanyService.findAll(),
      ItemService.findAll({ where: itemWhere, orderBy: 'name', orderDirection: 'ASC' }),
    ]).then(([comps, items]) => {
      setCompanies(comps);
      setStockItems(items);
    });
  }, []);

  const loadProjectsForCompany = useCallback(async (companyId: number) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where: Record<string, unknown> = { company_id: companyId };
    if (businessId != null) where.business_id = businessId;
    const projectList = await ProjectService.findAll({
      where,
      orderBy: 'name',
      orderDirection: 'ASC',
      limit: 500,
    });
    setProjects(projectList);
    return projectList;
  }, []);

  // Pre-select company if initialCompanyId is provided
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
        setSelectedProject(null);
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
      QuotationService.count()
        .then((count) => {
          setFormData((prev) => ({
            ...prev,
            quotation_number: String(count + 1).padStart(4, '0'),
          }));
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
      const [quotation, items] = await Promise.all([
        QuotationService.findById(quotationId),
        QuotationLineService.findByQuotationId(quotationId),
      ]);
      if (quotation) {
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
            setSelectedProject(null);
          }
        } else if (quotation.project_id != null) {
          const project = await ProjectService.findById(quotation.project_id);
          setSelectedProject(project);
        } else {
          setSelectedProject(null);
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
    return {
      linesSubtotal,
      discountAmount,
      subtotalAfterDiscount,
      taxAmount,
      total,
    };
  }, [lineRows, globalDiscountPercent, formData.tax_rate]);

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
    setSelectedProject(null);
    if (company.id != null) {
      loadProjectsForCompany(company.id).catch(() => setProjects([]));
    }
  }, [loadProjectsForCompany]);

  const handleCompanyClear = useCallback(() => {
    setSelectedCompany(null);
    setSelectedProject(null);
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
    setSelectedProject(project);
    setFormData((prev) => ({
      ...prev,
      project_id: project.id,
    }));
  }, []);

  const handleProjectClear = useCallback(() => {
    setSelectedProject(null);
    setFormData((prev) => ({ ...prev, project_id: undefined }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.quotation_number || !formData.customer_name) {
      setError('Quotation number and company are required');
      return;
    }
    if (!quotationId && !formData.project_id) {
      setError('Project is required for new quotations');
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
      if (quotationId) {
        await QuotationService.update(quotationId, payload);
        await QuotationLineService.deleteByQuotationId(quotationId);
        if (items.length) await QuotationLineService.insertMany(quotationId, items);
      } else {
        const created = await QuotationService.create(payload);
        const newId = created?.id;
        if (newId != null && items.length) await QuotationLineService.insertMany(newId, items);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
  const groupClass = 'flex flex-col';

  if (loading && quotationId) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        Loading quotation...
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-2 mb-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
            aria-label="Back"
          >
            ←
          </button>
        )}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {quotationId ? 'Edit Quotation' : 'Create Quotation'}
        </h2>
      </div>
      {error && (
        <div className="mb-2 px-3 py-2 text-sm rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-lg shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-2 md:grid-cols-4">
          <div className={groupClass}>
            <label htmlFor="quotation_number" className={labelClass}>
              Quotation #
            </label>
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
            <label htmlFor="order_number" className={labelClass}>
              Order #
            </label>
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
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
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
            <label htmlFor="currency" className={labelClass}>
              Currency
            </label>
            <select
              id="currency"
              value={formData.currency || 'ZAR'}
              onChange={(e) => handleChange('currency', e.target.value)}
              className={inputClass}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className={groupClass}>
            <label htmlFor="issue_date" className={labelClass}>
              Issue Date
            </label>
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
            <label htmlFor="valid_until" className={labelClass}>
              Valid Until
            </label>
            <input
              id="valid_until"
              type="date"
              value={formData.valid_until || ''}
              onChange={(e) => handleChange('valid_until', e.target.value || undefined)}
              className={inputClass}
            />
          </div>
          <div className={groupClass}>
            <label htmlFor="terms" className={labelClass}>
              Terms
            </label>
            <select
              id="terms"
              value={formData.terms || ''}
              onChange={(e) => handleChange('terms', e.target.value)}
              className={inputClass}
            >
              <option value="">Select terms...</option>
              <option value="C.O.D">C.O.D (Cash on Delivery)</option>
              <option value="Net 7">Net 7 Days</option>
              <option value="Net 14">Net 14 Days</option>
              <option value="Net 30">Net 30 Days</option>
              <option value="Net 60">Net 60 Days</option>
              <option value="Due on Receipt">Due on Receipt</option>
            </select>
          </div>
          <div className={groupClass}>
            <label htmlFor="delivery_conditions" className={labelClass}>
              Delivery
            </label>
            <select
              id="delivery_conditions"
              value={formData.delivery_conditions || ''}
              onChange={(e) => handleChange('delivery_conditions', e.target.value)}
              className={inputClass}
            >
              <option value="">Select...</option>
              <option value="collect">Collect</option>
              <option value="deliver">Deliver</option>
            </select>
          </div>
        </div>

        <div className="pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            Company
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
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
                placeholder="Search company..."
              />
              {(formData.customer_email || formData.customer_address) && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  {formData.customer_email && <div>{formData.customer_email}</div>}
                  {formData.customer_address && <div>{formData.customer_address}</div>}
                </div>
              )}
              <div className="flex flex-row gap-2">

              <div className={`${groupClass} mt-2 flex-1`}>
                <AppLabledAutocomplete
                  label="Project *"
                  options={projects}
                  value={selectedProject?.id != null ? String(selectedProject.id) : ''}
                  displayValue={selectedProject?.name ?? ''}
                  accessor="name"
                  valueAccessor="id"
                  onSelect={handleProjectSelect}
                  onClear={handleProjectClear}
                  required={!quotationId}
                  disabled={!selectedCompany}
                  placeholder={selectedCompany ? 'Search project...' : 'Select company first'}
                />
              </div>
              <div className={`${groupClass} mt-2 flex-1`}>
                <label htmlFor="customer_vat_number" className={labelClass}>
                  Company VAT #
                </label>
                <input
                  id="customer_vat_number"
                  type="text"
                  value={formData.customer_vat_number || ''}
                  onChange={(e) => handleChange('customer_vat_number', e.target.value)}
                  className={inputClass}
                  placeholder="VAT number"
                />
              </div>
              </div>
            </div>
            <div className={groupClass}>
              <label htmlFor="delivery_address" className={labelClass}>
                Delivery address
              </label>
              <textarea
                id="delivery_address"
                value={formData.delivery_address || ''}
                onChange={(e) => handleChange('delivery_address', e.target.value)}
                rows={3}
                className={`${inputClass} resize-y min-h-[80px]`}
                placeholder="Delivery address (if different from billing)"
              />
            </div>
          </div>
        </div>

        <div className="pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            Line items
          </h3>
          <LineItemsEditor
            rows={lineRows}
            stockItems={stockItems}
            currency={formData.currency || 'ZAR'}
            onChange={setLineRows}
          />
        </div>

        <div className="pb-3 mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            Totals
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-2 md:grid-cols-2">
            <div className={groupClass}>
              <label className={labelClass}>Global discount %</label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={globalDiscountPercent || ''}
                onChange={(e) =>
                  setGlobalDiscountPercent(parseFloat(e.target.value) || 0)
                }
                className={inputClass}
              />
            </div>
            <div className={groupClass}>
              <label htmlFor="tax_rate" className={labelClass}>
                Tax %
              </label>
              <input
                id="tax_rate"
                type="number"
                step="0.01"
                min={0}
                value={formData.tax_rate || ''}
                onChange={(e) =>
                  handleChange('tax_rate', parseFloat(e.target.value) || 0)
                }
                className={inputClass}
              />
            </div>
          </div>
          <div className="rounded-md bg-gray-50 dark:bg-gray-700/50 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-gray-700 dark:text-gray-300">
              <span>Subtotal (lines)</span>
              <span>{formatCurrency(totals.linesSubtotal, formData.currency)}</span>
            </div>
            {globalDiscountPercent > 0 && (
              <>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Discount ({globalDiscountPercent}%)</span>
                  <span>-{formatCurrency(totals.discountAmount, formData.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal after discount</span>
                  <span>{formatCurrency(totals.subtotalAfterDiscount, formData.currency)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tax ({(formData.tax_rate ?? 0)}%)</span>
              <span>{formatCurrency(totals.taxAmount, formData.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200 dark:border-gray-600">
              <span>Total</span>
              <span>{formatCurrency(totals.total, formData.currency)}</span>
            </div>
          </div>
        </div>

        <div className={groupClass}>
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className={`${inputClass} resize-y min-h-10`}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 pt-3 mt-4 border-t border-gray-200 dark:border-gray-700 sm:flex-row sm:justify-end">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-4 py-1.5 text-sm font-medium rounded-md transition-colors sm:w-auto bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-1.5 text-sm font-medium text-white rounded-md transition-colors sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : quotationId ? 'Update Quotation' : 'Create Quotation'}
          </button>
        </div>
      </form>
    </div>
  );
}
