import { useState, useEffect, useMemo, useCallback } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import type { CreateInvoiceDto, InvoiceStatus } from '../../types/invoice';
import type { Company } from '../../types/company';
import type { Project } from '../../types/project';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useCompanyStore } from '../../stores/data/CompanyStore';
import { useItemStore } from '../../stores/data/ItemStore';
import { useProjectStore } from '../../stores/data/ProjectStore';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { isCreditNoteInvoice } from '../../utils/invoiceLedger';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import { formatCurrency, SUPPORTED_CURRENCIES } from '../../utils/currency';
import LineItemsEditor, { type LineRow, lineTotal } from '../documents/LineItemsEditor';

const NO_PROJECT_ID = -1;
const NO_PROJECT_OPTION: Project = {
  id: NO_PROJECT_ID,
  company_id: 0,
  name: 'No project',
};

interface InvoiceFormProps {
  invoiceId?: number;
  /** When set (new document only), prefill from this invoice as a credit note. */
  creditFromInvoiceId?: number;
  /** New credit note without copying lines from an invoice (`?credit_note=1`). */
  standaloneCreditNote?: boolean;
  initialCompanyId?: number;
  initialProjectId?: number;
  onSuccess?: (createdId?: number) => void;
  onCancel?: () => void;
}

export function InvoiceForm({
  invoiceId,
  creditFromInvoiceId,
  standaloneCreditNote,
  initialCompanyId,
  initialProjectId,
  onSuccess,
  onCancel,
}: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const fetchItems = useItemStore((s) => s.fetchItems);
  const companies = useCompanyStore((s) => s.companies);
  const stockItems = useItemStore((s) => s.items);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(NO_PROJECT_OPTION);
  const [lineRows, setLineRows] = useState<LineRow[]>([]);
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [initialCompanyApplied, setInitialCompanyApplied] = useState(false);
  const [initialProjectApplied, setInitialProjectApplied] = useState(false);

  const [formData, setFormData] = useState<CreateInvoiceDto>({
    company_id: undefined,
    project_id: undefined,
    document_kind: 'invoice',
    credited_invoice_id: undefined,
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
    if (creditFromInvoiceId) return;
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
          delivery_address: company.address ?? '',
        }));
        setSelectedProject(NO_PROJECT_OPTION);
        setInitialProjectApplied(false);
        loadProjectsForCompany(company.id!);
        setInitialCompanyApplied(true);
      }
    }
  }, [creditFromInvoiceId, initialCompanyId, companies, initialCompanyApplied, invoiceId, loadProjectsForCompany]);

  useEffect(() => {
    if (creditFromInvoiceId) return;
    if (!invoiceId && initialProjectId && projects.length > 0 && !initialProjectApplied) {
      const project = projects.find((p) => p.id === initialProjectId);
      if (project) {
        setSelectedProject(project);
        setFormData((prev) => ({ ...prev, project_id: project.id }));
        setInitialProjectApplied(true);
      }
    }
  }, [creditFromInvoiceId, invoiceId, initialProjectId, projects, initialProjectApplied]);

  useEffect(() => {
    if (invoiceId || creditFromInvoiceId || standaloneCreditNote) return;
    useInvoiceStore
      .getState()
      .peekNextInvoiceNumber()
      .then((num) => {
        setFormData((prev) => ({ ...prev, invoice_number: num }));
      })
      .catch(() => {});
  }, [invoiceId, creditFromInvoiceId, standaloneCreditNote]);

  useEffect(() => {
    if (!standaloneCreditNote || invoiceId) return;
    void useInvoiceStore
      .getState()
      .peekNextCreditNoteNumber()
      .then((cn) => {
        setFormData((prev) => ({
          ...prev,
          document_kind: 'credit_note',
          credited_invoice_id: undefined,
          invoice_number: cn,
        }));
      })
      .catch(() => {});
  }, [standaloneCreditNote, invoiceId]);

  const [creditPrefillError, setCreditPrefillError] = useState<string | null>(null);
  const [creditPrefillDone, setCreditPrefillDone] = useState(false);

  useEffect(() => {
    if (!creditFromInvoiceId || invoiceId) return;
    let cancelled = false;
    setCreditPrefillError(null);
    setCreditPrefillDone(false);
    void (async () => {
      try {
        const { invoice: src, items } = await useInvoiceStore
          .getState()
          .fetchInvoiceWithItems(creditFromInvoiceId);
        if (cancelled) return;
        if (!src) {
          setCreditPrefillError('Source invoice not found.');
          return;
        }
        if (isCreditNoteInvoice(src)) {
          setCreditPrefillError('Cannot create a credit note from a credit note.');
          return;
        }
        const cn = await useInvoiceStore.getState().peekNextCreditNoteNumber();
        if (cancelled) return;
        const companyList = useCompanyStore.getState().companies;
        const matchedCompany =
          src.company_id != null ? companyList.find((c) => c.id === src.company_id) ?? null : null;
        setFormData({
          company_id: src.company_id,
          project_id: src.project_id,
          document_kind: 'credit_note',
          credited_invoice_id: creditFromInvoiceId,
          invoice_number: cn,
          customer_name: src.customer_name,
          customer_email: src.customer_email || '',
          customer_address: src.customer_address || '',
          customer_vat_number: src.customer_vat_number || '',
          delivery_address: src.delivery_address || matchedCompany?.address || '',
          delivery_conditions: src.delivery_conditions || '',
          order_number: src.order_number || '',
          terms: src.terms || 'C.O.D',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          subtotal: src.subtotal,
          tax_rate: src.tax_rate || 0,
          tax_amount: src.tax_amount || 0,
          total: src.total,
          currency: src.currency || 'ZAR',
          notes: src.notes || '',
        });
        setSelectedCompany(matchedCompany);
        if (matchedCompany?.id) {
          const projectList = await useProjectStore.getState().fetchProjectsForCompany(matchedCompany.id);
          if (!cancelled && src.project_id != null) {
            const matchedProject = projectList.find((p) => p.id === src.project_id) ?? null;
            setSelectedProject(matchedProject ?? NO_PROJECT_OPTION);
          } else if (!cancelled) {
            setSelectedProject(NO_PROJECT_OPTION);
          }
        } else if (!cancelled) {
          setSelectedProject(NO_PROJECT_OPTION);
        }
        const rows: LineRow[] = (items || []).map((item) => ({
          id: `line-new-${item.id ?? Math.random()}`,
          itemId: item.item_id,
          sku: item.sku || '',
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          discountPercent: Number(item.discount_percent ?? 0),
          unit_type: (item.unit_type as 'qty' | 'hrs') ?? 'qty',
        }));
        if (!cancelled) {
          setLineRows(rows);
          setGlobalDiscountPercent(Number(src.discount_percent ?? 0));
          setCreditPrefillDone(true);
        }
      } catch {
        if (!cancelled) setCreditPrefillError('Failed to load source invoice.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creditFromInvoiceId, invoiceId]);

  useEffect(() => {
    if (invoiceId) loadInvoice();
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId || !formData.company_id || companies.length === 0 || selectedCompany) return;
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
  }, [invoiceId, formData.company_id, formData.project_id, companies, selectedCompany, loadProjectsForCompany]);

  const loadInvoice = async () => {
    if (!invoiceId) return;
    try {
      setLoading(true);
      const { invoice, items } = await useInvoiceStore.getState().fetchInvoiceWithItems(invoiceId);
      if (invoice) {
        const matchedCompany = invoice.company_id != null
          ? companies.find((c) => c.id === invoice.company_id) ?? null
          : null;
        setFormData({
          company_id: invoice.company_id,
          project_id: invoice.project_id,
          document_kind: invoice.document_kind ?? 'invoice',
          credited_invoice_id: invoice.credited_invoice_id ?? undefined,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          customer_email: invoice.customer_email || '',
          customer_address: invoice.customer_address || '',
          customer_vat_number: invoice.customer_vat_number || '',
          delivery_address: invoice.delivery_address || matchedCompany?.address || '',
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
        setSelectedCompany(matchedCompany);
        if (matchedCompany?.id) {
          const projectList = await loadProjectsForCompany(matchedCompany.id);
          if (invoice.project_id != null) {
            const matchedProject = projectList.find((p) => p.id === invoice.project_id) ?? null;
            setSelectedProject(matchedProject);
          } else {
            setSelectedProject(NO_PROJECT_OPTION);
          }
        } else if (invoice.project_id != null) {
          const project = await useProjectStore.getState().findProjectById(invoice.project_id);
          setSelectedProject(project);
        } else {
          setSelectedProject(NO_PROJECT_OPTION);
        }
        const rows: LineRow[] = (items || []).map((item) => ({
          id: `line-${item.id ?? Math.random()}`,
          itemId: item.item_id,
          sku: item.sku || '',
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          discountPercent: Number(item.discount_percent ?? 0),
          unit_type: (item.unit_type as 'qty' | 'hrs') ?? 'qty',
        }));
        setLineRows(rows);
        setGlobalDiscountPercent(Number(invoice.discount_percent ?? 0));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
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
    if (!formData.invoice_number || !formData.customer_name) {
      setError('Invoice number and company are required');
      return;
    }
    const items = lineRows
      .filter((r) => r.description && r.quantity > 0)
      .map((r) => ({
        sku: r.sku || undefined,
        description: r.description,
        quantity: r.quantity,
        unit_price: r.unit_price,
        discount_percent: r.discountPercent || 0,
        unit_type: r.unit_type,
        total: lineTotal(r),
        item_id: r.itemId,
      }));
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const payload: CreateInvoiceDto = {
      ...formData,
      document_kind: formData.document_kind ?? 'invoice',
      credited_invoice_id:
        formData.document_kind === 'credit_note' ? formData.credited_invoice_id ?? null : null,
      discount_percent: globalDiscountPercent || 0,
      ...(businessId != null && { business_id: businessId }),
      items: items.length ? items : undefined,
    };
    try {
      setLoading(true);
      if (invoiceId) {
        await useInvoiceStore.getState().saveInvoiceWithLines(invoiceId, payload, items);
        onSuccess?.();
      } else {
        const newId = await useInvoiceStore.getState().createInvoiceWithLines(payload, items);
        onSuccess?.(newId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors font-[inherit]';
  const labelClass = 'mb-1 text-sm font-medium text-gray-700 dark:text-gray-300';
  const groupClass = 'flex flex-col';

  const isCreditNote = formData.document_kind === 'credit_note';

  if (loading && invoiceId) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        Loading invoice...
      </div>
    );
  }

  if (creditFromInvoiceId && !invoiceId && !creditPrefillDone && !creditPrefillError) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        Preparing credit note from invoice…
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex items-center gap-3 mb-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 shrink-0 rounded-lg p-1.5 -ml-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
            aria-label="Back"
          >
            <LuArrowLeft className="w-5 h-5" aria-hidden />
            <span>Back</span>
          </button>
        )}
        <h2 className="m-0 text-xl font-semibold text-gray-900 dark:text-gray-100">
          {invoiceId
            ? isCreditNote
              ? 'Edit Credit Note'
              : 'Edit Invoice'
            : isCreditNote
              ? 'Create Credit Note'
              : 'Create Invoice'}
        </h2>
      </div>
      {(error || creditPrefillError) && (
        <div className="mb-2 px-3 py-2 text-sm rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error || creditPrefillError}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="p-4 rounded-lg shadow bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-2 md:grid-cols-4">
          <div className={groupClass}>
            <label htmlFor="invoice_number" className={labelClass}>
              {isCreditNote ? 'Credit note #' : 'Invoice #'}
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
              <option value="accepted">Accepted</option>
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
              <div className="flex flex-row gap-2">
                <div className={`${groupClass} mt-2 flex-1`}>
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
                    placeholder={selectedCompany ? 'Search project...' : 'No project'}
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
                onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
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
                onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
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
              <span>Tax ({formData.tax_rate ?? 0}%)</span>
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
            {loading
              ? 'Saving...'
              : invoiceId
                ? isCreditNote
                  ? 'Update Credit Note'
                  : 'Update Invoice'
                : isCreditNote
                  ? 'Create Credit Note'
                  : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}
