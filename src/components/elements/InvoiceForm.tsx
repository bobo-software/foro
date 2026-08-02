import { useState, useEffect, useMemo, useCallback } from 'react';
import { LuArrowLeft } from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { CreateInvoiceDto } from '../../types/invoice';
import type { Company } from '../../types/company';
import type { Project } from '../../types/project';
import TimeEntryService, { MAX_BILLABLE_ROLLUP_ROWS } from '../../services/timeEntryService';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useCompanyStore } from '../../stores/data/CompanyStore';
import { useItemStore } from '../../stores/data/ItemStore';
import { useProjectStore } from '../../stores/data/ProjectStore';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { isCreditNoteInvoice } from '../../utils/invoiceLedger';
import { logger } from '../../utils/logger';
import { InvoiceHeaderFields } from './InvoiceHeaderFields';
import { InvoiceBillableTimeSummary } from './InvoiceBillableTimeSummary';
import AppLabeledAreaInput from '../forms/AppLabledAreaInput';
import AppLabledAutocomplete from '../forms/AppLabledAutocomplete';
import AppInputLabeled from '../forms/AppLabledInput';
import { formatCurrency } from '../../utils/currency';
import LineItemsEditor, { type LineRow, lineTotal } from '../documents/LineItemsEditor';
import { computeBaselineQuantities, computeStockAvailability, hasInsufficientStock, formatInsufficientStockMessage } from '../../utils/stockAvailability';

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
  const [baselineQuantities, setBaselineQuantities] = useState<Record<number, number>>({});
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState(0);
  const [initialCompanyApplied, setInitialCompanyApplied] = useState(false);
  const [initialProjectApplied, setInitialProjectApplied] = useState(false);

  const currentBusinessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [billableSummary, setBillableSummary] = useState<{
    loading: boolean;
    totalMinutes: number;
    entryCount: number;
    capped: boolean;
  }>({ loading: false, totalMinutes: 0, entryCount: 0, capped: false });
  /** Matches `billableRollupKey` after the latest rollup response for that key (avoids empty copy before the first fetch runs). */
  const [billableLoadedKey, setBillableLoadedKey] = useState<string | null>(null);
  const [appendingBillableLine, setAppendingBillableLine] = useState(false);

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
      .catch((err: unknown) => logger.error('Failed to peek next invoice number:', err));
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
      .catch((err: unknown) => logger.error('Failed to peek next credit note number:', err));
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
    }).catch((err: unknown) => logger.error('Failed to load projects for invoice company:', err));
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
        setBaselineQuantities(computeBaselineQuantities(rows));
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

  const billableRollupKey = useMemo(() => {
    const projectId = formData.project_id;
    const sid = selectedProject?.id;
    if (projectId == null || sid == null || sid === NO_PROJECT_ID || !Number.isFinite(Number(projectId))) {
      return null;
    }
    const businessId = selectedProject?.business_id ?? currentBusinessId;
    if (businessId == null || !Number.isFinite(Number(businessId))) {
      return null;
    }
    return `${Number(projectId)}:${Number(businessId)}`;
  }, [formData.project_id, selectedProject?.id, selectedProject?.business_id, currentBusinessId]);

  useEffect(() => {
    if (billableRollupKey == null) {
      setBillableSummary({ loading: false, totalMinutes: 0, entryCount: 0, capped: false });
      setBillableLoadedKey(null);
      return;
    }
    const [projectIdStr, businessIdStr] = billableRollupKey.split(':');
    const project_id = Number(projectIdStr);
    const business_id = Number(businessIdStr);
    let cancelled = false;
    setBillableSummary((prev) => ({ ...prev, loading: true }));
    void TimeEntryService.sumBillableMinutesForProject({ project_id, business_id })
      .then(({ totalMinutes, entryCount, capped }) => {
        if (cancelled) return;
        setBillableSummary({ loading: false, totalMinutes, entryCount, capped });
        setBillableLoadedKey(billableRollupKey);
      })
      .catch(() => {
        if (!cancelled) {
          setBillableSummary({ loading: false, totalMinutes: 0, entryCount: 0, capped: false });
          setBillableLoadedKey(billableRollupKey);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [billableRollupKey]);

  const handleAppendBillableTimeLine = useCallback(async () => {
    if (selectedProject?.id == null || selectedProject.id === NO_PROJECT_ID) return;
    const businessId = selectedProject.business_id ?? currentBusinessId;
    if (businessId == null || !Number.isFinite(Number(businessId))) {
      toast.error('Select an active business to roll up billable time.');
      return;
    }
    setAppendingBillableLine(true);
    try {
      const { totalMinutes, entryCount, capped } = await TimeEntryService.sumBillableMinutesForProject({
        project_id: Number(selectedProject.id),
        business_id: Number(businessId),
      });
      if (entryCount === 0 || totalMinutes <= 0) {
        toast.error('No billable time to add as a line.');
        return;
      }
      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      const bh = selectedProject.budget_hours;
      const ba = selectedProject.budget_amount;
      let unitPrice = 0;
      if (bh != null && ba != null) {
        const h = Number(bh);
        const a = Number(ba);
        if (Number.isFinite(h) && Number.isFinite(a) && h > 0 && a >= 0) {
          unitPrice = Math.round((a / h) * 10000) / 10000;
        }
      }
      let desc = `Billable time — ${selectedProject.name} (${hours} h`;
      if (capped) {
        desc += `; rollup stopped at ~${MAX_BILLABLE_ROLLUP_ROWS.toLocaleString()} rows`;
      }
      desc += ')';
      if (unitPrice === 0) {
        desc += ' — set unit price (or set project budget hours and amount for a suggested rate)';
      }
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `line-${Date.now()}`;
      setLineRows((prev) => [
        ...prev,
        {
          id,
          description: desc,
          quantity: hours,
          unit_price: unitPrice,
          discountPercent: 0,
          unit_type: 'hrs',
        },
      ]);
      toast.success('Added a billable time line — review hours and unit price.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load billable time');
    } finally {
      setAppendingBillableLine(false);
    }
  }, [selectedProject, currentBusinessId]);

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
    const submittableRows = lineRows.filter((r) => r.description && r.quantity > 0);
    if (formData.document_kind !== 'credit_note') {
      const baseline = invoiceId ? baselineQuantities : {};
      const availability = computeStockAvailability(submittableRows, stockItems, baseline);
      if (hasInsufficientStock(availability)) {
        const message = formatInsufficientStockMessage(availability);
        setError(message);
        toast.error(message);
        return;
      }
    }
    const items = submittableRows
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
        <InvoiceHeaderFields
          isCreditNote={isCreditNote}
          formData={formData}
          onChange={handleChange}
        />

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
                  {formData.project_id != null &&
                    selectedProject?.id != null &&
                    selectedProject.id !== NO_PROJECT_ID && (
                      <InvoiceBillableTimeSummary
                        loading={billableSummary.loading}
                        isStale={billableRollupKey != null && billableLoadedKey !== billableRollupKey}
                        needsBusiness={selectedProject.business_id == null && currentBusinessId == null}
                        totalMinutes={billableSummary.totalMinutes}
                        entryCount={billableSummary.entryCount}
                        capped={billableSummary.capped}
                        appending={appendingBillableLine}
                        onAppend={() => void handleAppendBillableTimeLine()}
                      />
                    )}
                </div>
                <div className="mt-2 flex-1">
                  <AppInputLabeled
                    label="Company VAT #"
                    value={formData.customer_vat_number || ''}
                    onChange={(e) => handleChange('customer_vat_number', e.target.value)}
                    placeholder="VAT number"
                  />
                </div>
              </div>
            </div>
            <AppLabeledAreaInput
              label="Delivery address"
              value={formData.delivery_address || ''}
              onChange={(e) => handleChange('delivery_address', e.target.value)}
              rows={3}
              textareaClassName="resize-y min-h-[80px]"
              placeholder="Delivery address (if different from billing)"
            />
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
            stockBaseline={invoiceId && !isCreditNote ? baselineQuantities : undefined}
            disableStockWarnings={isCreditNote}
          />
        </div>

        <div className="pb-3 mb-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
            Totals
          </h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 mb-2 md:grid-cols-2">
            <AppInputLabeled
              label="Global discount %"
              type="number"
              step={0.01}
              min={0}
              max={100}
              value={String(globalDiscountPercent || '')}
              onChange={(e) => setGlobalDiscountPercent(parseFloat(e.target.value) || 0)}
            />
            <AppInputLabeled
              label="Tax %"
              type="number"
              step={0.01}
              min={0}
              value={String(formData.tax_rate || '')}
              onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
            />
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

        <AppLabeledAreaInput
          label="Notes"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={2}
          textareaClassName="resize-y min-h-10"
        />

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
