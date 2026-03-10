import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CreateInvoiceDto, InvoiceStatus, InvoiceItem } from '../../types/invoice';
import type { Company } from '../../types/company';
import type { Item } from '../../types/item';
import type { Project } from '../../types/project';
import InvoiceService from '../../services/invoiceService';
import InvoiceItemService from '../../services/invoiceItemService';
import CompanyService from '../../services/companyService';
import ItemService from '../../services/itemService';
import ProjectService from '../../services/projectService';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';

interface InvoiceFormProps {
  invoiceId?: number;
  initialCompanyId?: number;
  initialProjectId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface LineRow {
  id: string;
  itemId?: number;
  sku?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discountPercent: number;
}

function lineTotal(row: LineRow): number {
  const beforeDiscount = row.quantity * row.unit_price;
  return beforeDiscount * (1 - row.discountPercent / 100);
}

export function InvoiceForm({ invoiceId, initialCompanyId, initialProjectId, onSuccess, onCancel }: InvoiceFormProps) {
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

  const [formData, setFormData] = useState<CreateInvoiceDto>({
    company_id: undefined,
    project_id: undefined,
    invoice_number: '',
    customer_name: '',
    customer_email: '',
    customer_address: '',
    customer_vat_number: '',
    delivery_address: '',
    delivery_conditions: '',
    order_number: '',
    terms: 'C.O.D',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft',
    subtotal: 0,
    tax_rate: 15,
    tax_amount: 0,
    total: 0,
    currency: 'ZAR',
    notes: '',
  });

  // Load companies and stock items on mount
  useEffect(() => {
    Promise.all([CompanyService.findAll(), ItemService.findAll()]).then(
      ([comps, items]) => {
        setCompanies(comps);
        setStockItems(items);
      }
    );
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
    if (initialCompanyId && companies.length > 0 && !initialCompanyApplied && !invoiceId) {
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
        }));
        setSelectedProject(null);
        loadProjectsForCompany(company.id!);
        setInitialCompanyApplied(true);
      }
    }
  }, [initialCompanyId, companies, initialCompanyApplied, invoiceId, loadProjectsForCompany]);

  useEffect(() => {
    if (!invoiceId && initialProjectId && projects.length > 0 && formData.project_id == null) {
      const project = projects.find((p) => p.id === initialProjectId);
      if (project) {
        setSelectedProject(project);
        setFormData((prev) => ({ ...prev, project_id: project.id }));
      }
    }
  }, [invoiceId, initialProjectId, projects, formData.project_id]);

  // Auto-generate invoice number for new invoices (0001, 0002, ...)
  useEffect(() => {
    if (!invoiceId) {
      InvoiceService.count()
        .then((count) => {
          setFormData((prev) => ({
            ...prev,
            invoice_number: String(count + 1).padStart(4, '0'),
          }));
        })
        .catch(() => {});
    }
  }, [invoiceId]);

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId || !formData.company_id || companies.length === 0 || selectedCompany) return;
    const matchedCompany = companies.find((c) => c.id === formData.company_id) ?? null;
    if (!matchedCompany) return;
    setSelectedCompany(matchedCompany);
    loadProjectsForCompany(matchedCompany.id!).then((projectList) => {
      if (formData.project_id == null) return;
      const matchedProject = projectList.find((p) => p.id === formData.project_id) ?? null;
      setSelectedProject(matchedProject);
    }).catch(() => {});
  }, [invoiceId, formData.company_id, formData.project_id, companies, selectedCompany, loadProjectsForCompany]);

  const loadInvoice = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      const [invoice, items] = await Promise.all([
        InvoiceService.findById(invoiceId),
        InvoiceItemService.findByInvoiceId(invoiceId),
      ]);
      if (invoice) {
        setFormData({
          company_id: invoice.company_id,
          project_id: invoice.project_id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email || '',
          customer_address: invoice.customer_address || '',
          customer_vat_number: invoice.customer_vat_number || '',
          delivery_address: invoice.delivery_address || '',
          delivery_conditions: invoice.delivery_conditions || '',
          order_number: invoice.order_number || '',
          terms: invoice.terms || 'C.O.D',
          issue_date: invoice.issue_date.split('T')[0],
          due_date: invoice.due_date.split('T')[0],
          status: invoice.status,
          subtotal: invoice.subtotal,
          tax_rate: invoice.tax_rate || 0,
          tax_amount: invoice.tax_amount || 0,
          total: invoice.total,
          currency: invoice.currency || 'ZAR',
          notes: invoice.notes || '',
        });
        const matchedCompany = invoice.company_id != null
          ? companies.find((c) => c.id === invoice.company_id) ?? null
          : null;
        setSelectedCompany(matchedCompany);
        if (matchedCompany?.id) {
          const projectList = await loadProjectsForCompany(matchedCompany.id);
          if (invoice.project_id != null) {
            const matchedProject = projectList.find((p) => p.id === invoice.project_id) ?? null;
            setSelectedProject(matchedProject);
          } else {
            setSelectedProject(null);
          }
        } else if (invoice.project_id != null) {
          const project = await ProjectService.findById(invoice.project_id);
          setSelectedProject(project);
        } else {
          setSelectedProject(null);
        }
        const rows: LineRow[] = (items || []).map((item) => {
          const qty = item.quantity || 1;
          const up = Number(item.unit_price) || 0;
          const tot = Number(item.total) || 0;
          const beforeDiscount = qty * up;
          const discountPercent =
            beforeDiscount > 0 ? Math.round((1 - tot / beforeDiscount) * 100 * 100) / 100 : 0;
          return {
            id: `line-${item.id ?? Math.random()}`,
            itemId: item.item_id,
            sku: item.sku || '',
            description: item.description,
            quantity: qty,
            unit_price: up,
            discountPercent,
          };
        });
        setLineRows(rows);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  // Live calculations from line items + global discount + tax
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

  // Sync formData subtotal/tax_amount/total for API
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      subtotal: totals.subtotalAfterDiscount,
      tax_amount: totals.taxAmount,
      total: totals.total,
    }));
  }, [totals.subtotalAfterDiscount, totals.taxAmount, totals.total]);

  const handleChange = useCallback((field: keyof CreateInvoiceDto, value: unknown) => {
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

  const addLine = useCallback(() => {
    setLineRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? `line-${Date.now()}`,
        description: '',
        quantity: 1,
        unit_price: 0,
        discountPercent: 0,
      },
    ]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLineRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateLine = useCallback((id: string, updates: Partial<LineRow>) => {
    setLineRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const onItemSelect = useCallback(
    (id: string) => (item: Item) => {
      updateLine(id, {
        itemId: item.id,
        sku: item.sku || '',
        description: item.name,
        unit_price: item.unit_price ?? 0,
      });
    },
    [updateLine]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.invoice_number || !formData.customer_name) {
      setError('Invoice number and company are required');
      return;
    }
    if (!invoiceId && !formData.project_id) {
      setError('Project is required for new invoices');
      return;
    }
    const items = lineRows
      .filter((r) => r.description && r.quantity > 0)
      .map((r) => ({
        sku: r.sku || undefined,
        description: r.description,
        quantity: r.quantity,
        unit_price: r.unit_price,
        total: lineTotal(r),
        item_id: r.itemId,
      }));
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const payload: CreateInvoiceDto = {
      ...formData,
      ...(businessId != null && { business_id: businessId }),
      items: items.length ? items : undefined,
    };
    try {
      setLoading(true);
      if (invoiceId) {
        await InvoiceService.update(invoiceId, payload);
        await InvoiceItemService.deleteByInvoiceId(invoiceId);
        if (items.length) await InvoiceItemService.insertMany(invoiceId, items);
      } else {
        const created = await InvoiceService.create(payload);
        const newId = created?.id;
        if (newId != null && items.length) await InvoiceItemService.insertMany(newId, items);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
  const readonlyClass = 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed';
  const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
  const groupClass = 'flex flex-col';

  if (loading && invoiceId) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        Loading invoice...
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto">
      <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
        {invoiceId ? 'Edit Invoice' : 'Create Invoice'}
      </h2>
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
            <label htmlFor="invoice_number" className={labelClass}>
              Invoice #
            </label>
            <input
              id="invoice_number"
              type="text"
              value={formData.invoice_number}
              onChange={(e) => handleChange('invoice_number', e.target.value)}
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
              onChange={(e) => handleChange('status', e.target.value as InvoiceStatus)}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
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
            <label htmlFor="due_date" className={labelClass}>
              Due Date
            </label>
            <input
              id="due_date"
              type="date"
              value={formData.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className={inputClass}
              required
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
              <div className={`${groupClass} mt-2`}>
                <AppLabledAutocomplete
                  label="Project *"
                  options={projects}
                  value={selectedProject?.id != null ? String(selectedProject.id) : ''}
                  displayValue={selectedProject?.name ?? ''}
                  accessor="name"
                  valueAccessor="id"
                  onSelect={handleProjectSelect}
                  onClear={handleProjectClear}
                  required={!invoiceId}
                  disabled={!selectedCompany}
                  placeholder={selectedCompany ? 'Search project...' : 'Select company first'}
                />
              </div>
              <div className={`${groupClass} mt-2`}>
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              Line items
            </h3>
            <button
              type="button"
              onClick={addLine}
              className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Add line
            </button>
          </div>
          {lineRows.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
              No items. Click &quot;Add line&quot; and select from stock.
            </p>
          ) : (
            <div className="space-y-2">
              {lineRows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-700/50 md:grid-cols-12 md:items-end"
                >
                  <div className={`${groupClass} md:col-span-2`}>
                    <label className={labelClass}>SKU</label>
                    <input
                      type="text"
                      value={row.sku || ''}
                      onChange={(e) => updateLine(row.id, { sku: e.target.value })}
                      className={inputClass}
                      placeholder="SKU"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <AppLabledAutocomplete
                      label=""
                      options={stockItems}
                      value={row.itemId != null ? String(row.itemId) : ''}
                      displayValue={row.description}
                      accessor="name"
                      valueAccessor="id"
                      onSelect={onItemSelect(row.id)}
                      onClear={() =>
                        updateLine(row.id, { itemId: undefined, sku: '', description: '', unit_price: 0 })
                      }
                      placeholder="Item"
                      className="mb-0"
                    />
                  </div>
                  <div className={`${groupClass} md:col-span-1`}>
                    <label className={labelClass}>Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) =>
                        updateLine(row.id, { quantity: parseInt(e.target.value, 10) || 1 })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className={`${groupClass} md:col-span-2`}>
                    <label className={labelClass}>Unit price</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={row.unit_price}
                      onChange={(e) =>
                        updateLine(row.id, {
                          unit_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className={`${groupClass} md:col-span-1`}>
                    <label className={labelClass}>Disc %</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={100}
                      value={row.discountPercent}
                      onChange={(e) =>
                        updateLine(row.id, {
                          discountPercent: parseFloat(e.target.value) || 0,
                        })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className={`${groupClass} md:col-span-2`}>
                    <label className={labelClass}>Line total</label>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrency(lineTotal(row), formData.currency)}
                      className={`${inputClass} ${readonlyClass}`}
                    />
                  </div>
                  <div className="flex items-end md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLine(row.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                value={globalDiscountPercent}
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
                value={formData.tax_rate}
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
            {loading ? 'Saving...' : invoiceId ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
