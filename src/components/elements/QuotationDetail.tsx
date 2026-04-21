import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LuCopy, LuPrinter, LuFileText } from 'react-icons/lu';
import ConverInvoiceModal from '../modals/ConverInvoiceModal';
import type { Quotation, QuotationLine, CreateQuotationDto } from '../../types/quotation';
import type { CreateInvoiceDto, InvoiceStatus } from '../../types/invoice';
import type { Project } from '../../types/project';
import { ACCOUNT_TYPES } from '../../types/bankingDetails';
import StorageService from '../../services/storageService';
import { useBusinessStore } from '../../stores/data/BusinessStore';
import { useQuotationStore } from '../../stores/data/QuotationStore';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { useProjectStore } from '../../stores/data/ProjectStore';
import { useBusinessDocumentContextStore } from '../../stores/data/BusinessDocumentContextStore';
import { formatCurrency } from '../../utils/currency';

interface QuotationDetailProps {
  quotationId: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function QuotationDetail({ quotationId, onEdit, onDelete }: QuotationDetailProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromCompany = searchParams.get('from_company');
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [lineItems, setLineItems] = useState<QuotationLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const convertInFlightRef = useRef(false);

  useEffect(() => {
    loadQuotation();
  }, [quotationId]);

  const loadQuotation = async () => {
    try {
      setLoading(true);
      setError(null);
      const { quotation: quo, lines } = await useQuotationStore.getState().fetchQuotationWithLines(quotationId);
      setQuotation(quo);
      setLineItems(lines);
      if (quo?.project_id != null) {
        useProjectStore.getState().findProjectById(quo.project_id).then((p) => setProject(p));
      } else {
        setProject(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const business = useBusinessStore((s) => s.currentBusiness);
  const bankingDetails = useBusinessDocumentContextStore((s) => s.bankingDetails);
  const contacts = useBusinessDocumentContextStore((s) => s.contacts);
  const loadDocumentContext = useBusinessDocumentContextStore((s) => s.loadForCurrentBusiness);

  useEffect(() => {
    if (business?.id == null) return;
    void loadDocumentContext();
  }, [business?.id, loadDocumentContext]);

  useEffect(() => {
    if (!business?.logo_url) { setLogoUrl(null); return; }
    StorageService.getFileDownloadUrl(business.logo_url)
      .then((url) => setLogoUrl(url ?? null))
      .catch(() => setLogoUrl(null));
  }, [business?.logo_url]);

  const handlePrint = useCallback(() => {
    if (!quotation) return;
    const prev = document.title;
    document.title = `quotation-${quotation.quotation_number}`;
    window.print();
    document.title = prev;
  }, [quotation]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      await useQuotationStore.getState().removeQuotation(quotationId);
      onDelete?.();
    } catch (err: unknown) {
      alert('Failed to delete quotation: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleDuplicate = useCallback(async () => {
    if (!quotation) return;
    try {
      setDuplicating(true);
      setError(null);
      const nextNumber = await useQuotationStore.getState().getNextQuotationNumber();
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      const payload: CreateQuotationDto = {
        company_id: quotation.company_id ?? undefined,
        project_id: quotation.project_id ?? undefined,
        quotation_number: nextNumber,
        customer_name: quotation.customer_name,
        customer_email: quotation.customer_email,
        customer_address: quotation.customer_address,
        customer_vat_number: quotation.customer_vat_number,
        delivery_address: quotation.delivery_address,
        delivery_conditions: quotation.delivery_conditions,
        order_number: quotation.order_number,
        terms: quotation.terms || 'C.O.D',
        issue_date: quotation.issue_date.split('T')[0],
        valid_until: quotation.valid_until ? quotation.valid_until.split('T')[0] : '',
        status: 'draft',
        subtotal: quotation.subtotal,
        discount_percent: quotation.discount_percent ?? 0,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        total: quotation.total,
        currency: quotation.currency || 'ZAR',
        notes: quotation.notes,
        ...(businessId != null && { business_id: businessId }),
      };
      const linePayload = lineItems
        .filter((line) => String(line.description ?? '').trim().length > 0 && Number(line.quantity) > 0)
        .map((line) => ({
          sku: line.sku && line.sku !== '' ? line.sku : undefined,
          description: String(line.description).trim(),
          quantity: line.quantity,
          unit_price: Number(line.unit_price) || 0,
          discount_percent: Number(line.discount_percent ?? 0),
          total: Number(line.total) || 0,
          unit_type: line.unit_type ?? 'qty',
          ...(line.item_id != null && { item_id: line.item_id }),
        }));
      const newId = await useQuotationStore.getState().duplicateQuotationWithLines(payload, linePayload);
      if (newId == null) {
        setError('Failed to create duplicate quotation');
        return;
      }
      const q = fromCompany ? `?from_company=${fromCompany}` : '';
      navigate(`/app/quotations/${newId}/edit${q}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate quotation');
    } finally {
      setDuplicating(false);
    }
  }, [quotation, lineItems, navigate, fromCompany]);

  const handleConvertToInvoice = useCallback(async (chosenStatus: InvoiceStatus = 'accepted') => {
    if (convertInFlightRef.current) return;
    if (!quotation) return;
    if (quotation.converted_invoice_id != null) {
      navigate(`/app/invoices/${quotation.converted_invoice_id}`);
      return;
    }
    convertInFlightRef.current = true;
    setConverting(true);
    setError(null);
    try {
      const { lines: rawLines } = await useQuotationStore.getState().fetchQuotationWithLines(quotationId);
      const linesToCopy = rawLines.filter(
        (line) => String(line.description ?? '').trim().length > 0 && Number(line.quantity) > 0
      );
      const invoiceNumber = await useInvoiceStore.getState().peekNextInvoiceNumber();
      const issueDate = quotation.issue_date.split('T')[0];
      const validUntil = quotation.valid_until ? new Date(quotation.valid_until) : null;
      const issueDateObj = new Date(quotation.issue_date);
      const dueDate =
        validUntil && validUntil > issueDateObj
          ? validUntil.toISOString().split('T')[0]
          : new Date(issueDateObj.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      const payload: CreateInvoiceDto = {
        invoice_number: invoiceNumber,
        ...(quotation.company_id != null && { company_id: quotation.company_id }),
        ...(quotation.project_id != null && { project_id: quotation.project_id }),
        customer_name: quotation.customer_name,
        customer_email: quotation.customer_email,
        customer_address: quotation.customer_address,
        customer_vat_number: quotation.customer_vat_number,
        delivery_address: quotation.delivery_address,
        delivery_conditions: quotation.delivery_conditions,
        order_number: quotation.order_number,
        terms: quotation.terms ?? 'C.O.D',
        issue_date: issueDate,
        due_date: dueDate,
        status: chosenStatus,
        subtotal: Number(quotation.subtotal) || 0,
        tax_rate: quotation.tax_rate,
        tax_amount: quotation.tax_amount,
        discount_percent: Number(quotation.discount_percent) || 0,
        total: Number(quotation.total) || 0,
        currency: quotation.currency || 'ZAR',
        notes: quotation.notes,
        ...(businessId != null && { business_id: businessId }),
      };
      const newId = await useInvoiceStore.getState().createInvoiceWithLines(
        payload,
        linesToCopy.map((line) => ({
          description: String(line.description).trim(),
          quantity: line.quantity,
          unit_price: Number(line.unit_price) || 0,
          unit_type: line.unit_type ?? 'qty',
          discount_percent: Number(line.discount_percent) || 0,
          total: Number(line.total) || 0,
          ...(line.sku != null && line.sku !== '' && { sku: line.sku }),
          ...(line.item_id != null && { item_id: line.item_id }),
        }))
      );
      await useQuotationStore.getState().markQuotationConverted(quotationId, newId);
      setConvertModalOpen(false);
      navigate(`/app/invoices/${newId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert to invoice');
    } finally {
      convertInFlightRef.current = false;
      setConverting(false);
    }
  }, [quotation, quotationId, navigate]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300',
      sent: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      accepted: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      declined: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      expired: 'bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400',
      converted: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    };
    return statusMap[status] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto p-4 md:p-8">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading quotation...</div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="max-w-[900px] mx-auto p-4 md:p-8">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-lg">
          {error || 'Quotation not found'}
        </div>
      </div>
    );
  }

  const vatRate = Number(quotation.tax_rate) || 0;
  const globalDiscountPercent = Number(quotation.discount_percent) || 0;
  const linesSubtotal = lineItems.length > 0
    ? lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
    : Number(quotation.subtotal) || 0;
  const discountAmount = (linesSubtotal * globalDiscountPercent) / 100;
  const subtotal = linesSubtotal - discountAmount;
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  const hasPage2 = !!quotation.notes;

  const isConvertedReadOnly = quotation.status === 'converted';

  const thClass = 'px-2 py-1.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';

  return (
    <div className="quotation-print-root w-full max-w-[794px] mx-auto px-4 py-4 flex flex-col gap-4 print:max-w-none print:px-0 print:py-0 print:gap-0">
      {/* Action bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="m-0 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Quotation {quotation.quotation_number}
            </h1>
          </div>
          <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(quotation.status)}`}>
            {quotation.status}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-1.5 h-[34px] px-3 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors">
            <LuPrinter size={15} aria-hidden />Print / Save PDF
          </button>
          <button
            type="button"
            onClick={() =>
              quotation.converted_invoice_id != null
                ? void handleConvertToInvoice()
                : setConvertModalOpen(true)
            }
            disabled={converting || duplicating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <LuFileText size={15} aria-hidden />
            {quotation.converted_invoice_id != null ? 'View invoice' : 'Convert to invoice'}
          </button>
          {isConvertedReadOnly && (
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <LuCopy size={15} aria-hidden />
              {duplicating ? 'Duplicating…' : 'Duplicate to edit'}
            </button>
          )}
          {onEdit && !isConvertedReadOnly && (
            <button onClick={onEdit} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">Edit</button>
          )}
          {onDelete && (
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">Delete</button>
          )}
        </div>
      </div>

      {/* ── Page 1 ── */}
      <div className="quotation-print-page bg-white dark:bg-gray-800 w-full min-h-[1123px] p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col gap-0 print:shadow-none print:border-none print:rounded-none print:min-h-0 print:p-8 print:bg-white dark:print:bg-white">

        {/* ── Header ── */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b-2 border-gray-300 dark:border-gray-600">
          {/* Left: logo + business name + address */}
          <div className="flex-1 min-w-0">
            {logoUrl && (
              <img src={logoUrl} alt="logo" className="mb-2 max-h-14 max-w-[120px] object-contain" />
            )}
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 leading-tight">{business?.name ?? '—'}</p>
            {business?.address && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line leading-snug max-w-[160px]">{business.address}</p>
            )}
          </div>

          {/* Middle: Tel / VAT / Reg */}
          <div className="flex-1 flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400 pt-1 px-4">
            {business?.phone && <span>Tel: {business.phone}</span>}
            {business?.vat_number && <span>VAT: {business.vat_number}</span>}
            {business?.registration_number && <span>Reg: {business.registration_number}</span>}
            {contacts[0]?.email && <span>{contacts[0].email}</span>}
          </div>

          {/* Right: document title / number / order / status */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 tracking-wide uppercase leading-none">Quotation</p>
            <p className="text-base font-semibold text-gray-700 dark:text-gray-200">{quotation.quotation_number}</p>
            {quotation.order_number && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Order: {quotation.order_number}</p>
            )}
            {project && (
              <p className="text-xs text-gray-500 dark:text-gray-400">Project: {project.name}</p>
            )}
            <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${getStatusBadgeClass(quotation.status)}`}>
              {quotation.status}
            </span>
          </div>
        </div>

        {/* ── Bill To / Deliver To ── */}
        <div className="grid grid-cols-2 gap-6 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Bill To</p>
            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{quotation.customer_name}</p>
            {quotation.customer_vat_number && <p className="text-xs text-gray-500 dark:text-gray-400">VAT: {quotation.customer_vat_number}</p>}
            {quotation.customer_address && <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{quotation.customer_address}</p>}
            {quotation.customer_email && <p className="text-xs text-gray-500 dark:text-gray-400">{quotation.customer_email}</p>}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Deliver To</p>
            {quotation.delivery_address ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-line">{quotation.delivery_address}</p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">Same as billing address</p>
            )}
            {quotation.delivery_conditions && (
              <p className="mt-1 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                Delivery: {quotation.delivery_conditions === 'collect' ? 'COLLECT' : 'DELIVER'}
              </p>
            )}
          </div>
        </div>

        {/* ── Dates row ── */}
        <div className="flex flex-wrap gap-x-8 gap-y-1 pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
          <span><span className="text-gray-400 dark:text-gray-500">Issue Date: </span>{formatDate(quotation.issue_date)}</span>
          {quotation.valid_until && (
            <span><span className="text-gray-400 dark:text-gray-500">Valid Until: </span>{formatDate(quotation.valid_until)}</span>
          )}
          {quotation.terms && (
            <span><span className="text-gray-400 dark:text-gray-500">Terms: </span>{quotation.terms}</span>
          )}
        </div>

        {/* ── Line items table ── */}
        <div className="mb-4">
          {lineItems.length > 0 ? (
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                  <th className={`${thClass} w-8 border-r border-gray-200 dark:border-gray-600`}>No.</th>
                  <th className={`${thClass} w-20 border-r border-gray-200 dark:border-gray-600`}>SKU</th>
                  <th className={`${thClass} border-r border-gray-200 dark:border-gray-600`}>Description</th>
                  <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Qty</th>
                  <th className={`${thClass} text-right border-r border-gray-200 dark:border-gray-600`}>Unit Price</th>
                  <th className={`${thClass} text-right`}>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const qty = Number(item.quantity) || 0;
                  const unitPrice = Number(item.unit_price) || 0;
                  const itemTotal = Number(item.total) ?? qty * unitPrice;
                  return (
                    <tr
                      key={item.id ?? `${item.description}-${idx}`}
                      className={`border border-gray-200 dark:border-gray-700 ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/30' : ''}`}
                    >
                      <td className="px-2 py-1 text-gray-400 dark:text-gray-500 border-r border-gray-200 dark:border-gray-600">{idx + 1}</td>
                      <td className="px-2 py-1 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">{item.sku ?? '—'}</td>
                      <td className="px-2 py-1 text-gray-800 dark:text-gray-200 border-r border-gray-200 dark:border-gray-600">{item.description}</td>
                      <td className="px-2 py-1 text-right text-green-600 dark:text-green-400 font-medium border-r border-gray-200 dark:border-gray-600">
                        {qty}{item.unit_type === 'hrs' ? ' hrs' : ''}
                      </td>
                      <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600">{formatCurrency(unitPrice, quotation.currency)}</td>
                      <td className="px-2 py-1 text-right text-gray-800 dark:text-gray-200 font-medium">{formatCurrency(itemTotal, quotation.currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 py-2">No line items.</p>
          )}
        </div>

        {/* ── Banking + Totals — pushed to bottom ── */}
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 print:break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 items-start print:break-inside-avoid">
            {/* Banking */}
            {bankingDetails.length > 0 ? (
              <div className="text-xs">
                <p className="mb-1.5 font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-xs">Banking Details</p>
                {bankingDetails.map((bd) => (
                  <div key={bd.id} className="mb-3">
                    {bd.label && <p className="font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{bd.label}</p>}
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-gray-600 dark:text-gray-400">
                      <span className="text-gray-400 dark:text-gray-500">Bank</span><span>{bd.bank_name}</span>
                      {bd.account_holder && (<><span className="text-gray-400 dark:text-gray-500">Acc. Holder</span><span>{bd.account_holder}</span></>)}
                      <span className="text-gray-400 dark:text-gray-500">Account No.</span><span>{bd.account_number}</span>
                      {bd.account_type && (<><span className="text-gray-400 dark:text-gray-500">Acc. Type</span><span>{ACCOUNT_TYPES.find((t) => t.value === bd.account_type)?.label ?? bd.account_type}</span></>)}
                      {bd.branch_code && (<><span className="text-gray-400 dark:text-gray-500">Branch Code</span><span>{bd.branch_code}</span></>)}
                      {bd.swift_code && (<><span className="text-gray-400 dark:text-gray-500">SWIFT</span><span>{bd.swift_code}</span></>)}
                    </div>
                  </div>
                ))}
              </div>
            ) : <div />}

            {/* Totals */}
            <div className="text-xs">
              {globalDiscountPercent > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                  <span>Lines subtotal</span>
                  <span>{formatCurrency(linesSubtotal, quotation.currency)}</span>
                </div>
              )}
              {globalDiscountPercent > 0 && (
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-green-600 dark:text-green-400">
                  <span>Discount ({globalDiscountPercent}%)</span>
                  <span>−{formatCurrency(discountAmount, quotation.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, quotation.currency)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400">
                <span>VAT ({vatRate}%)</span>
                <span>{formatCurrency(vatAmount, quotation.currency)}</span>
              </div>
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-700 dark:border-gray-300 text-sm font-bold text-gray-900 dark:text-gray-100">
                <span>Total</span>
                <span>{formatCurrency(total, quotation.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-auto pt-6 text-center">
          <p className="text-xs text-gray-300 dark:text-gray-600">Foroman by Bobo Softwares (2026)</p>
        </div>
      </div>

      {/* ── Convert to Invoice modal ── */}
      <ConverInvoiceModal
        isOpen={convertModalOpen}
        onClose={() => !converting && setConvertModalOpen(false)}
        onConfirm={handleConvertToInvoice}
        converting={converting}
        quotationNumber={quotation.quotation_number}
        quotationStatus={quotation.status}
        customerName={quotation.customer_name}
        subtotal={subtotal}
        vatRate={vatRate}
        vatAmount={vatAmount}
        total={total}
        currency={quotation.currency}
      />

      {/* ── Page 2 — notes ── */}
      {hasPage2 && (
        <div className="quotation-print-page bg-white dark:bg-gray-800 w-full min-h-[1123px] p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col print:shadow-none print:border-none print:rounded-none print:min-h-0 print:p-8 print:bg-white dark:print:bg-white">
          <div className="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Notes</p>
            <p className="m-0 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">
              {quotation.notes}
            </p>
          </div>
          <div className="mt-auto pt-6 text-center">
            <p className="text-xs text-gray-300 dark:text-gray-600">Foroman by Bobo Softwares (2026)</p>
          </div>
        </div>
      )}
    </div>
  );
}
