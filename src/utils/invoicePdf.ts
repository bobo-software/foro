import type { Invoice, InvoiceItem } from '../types/invoice';
import { useInvoiceStore } from '../stores/data/InvoiceStore';
import InvoiceService from '../services/invoiceService';
import { isCreditNoteInvoice } from './invoiceLedger';
import type { Business } from '../types/business';
import type { DocumentTemplateId } from '../types/documentTemplate';
import { getTemplateConfig } from '../types/documentTemplate';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import {
  renderHeader, renderCustomerSection, renderDatesRow,
  renderLineItemsTable, renderTotalsSection, renderNotesSection,
  renderSignatureSection, renderFooter,
} from './pdfTemplates/templateRenderer';
import { useBusinessStore } from '../stores/data/BusinessStore';

/** Fetch invoice + line items by id, then download PDF. Use from list view. */
export async function downloadInvoicePdfById(invoiceId: number): Promise<void> {
  const { invoice, items } = await useInvoiceStore.getState().fetchInvoiceWithItems(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const business = useBusinessStore.getState().currentBusiness;
  await generateInvoicePdf(invoice, items, business);
}

export async function generateInvoicePdf(
  invoice: Invoice,
  lineItems: InvoiceItem[] = [],
  business?: Business | null,
  templateOverride?: DocumentTemplateId,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const isCn = isCreditNoteInvoice(invoice);
  let creditedInvoiceNumber: string | null = null;
  if (invoice.credited_invoice_id != null) {
    try {
      const src = await InvoiceService.findById(invoice.credited_invoice_id);
      if (src?.invoice_number) creditedInvoiceNumber = src.invoice_number;
    } catch {
      /* ignore */
    }
  }

  // Resolve template config — use override if provided, otherwise business preference
  const config = getTemplateConfig(templateOverride ?? business?.document_template);
  const curr = invoice.currency || 'ZAR';

  // Fetch logo if enabled
  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business.logo_url!) : null;

  // Status color map for invoices
  const statusColors: Record<string, [number, number, number]> = {
    draft: [100, 100, 100],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    overdue: [239, 68, 68],
    cancelled: [156, 163, 175],
  };

  // ── Header ──
  let y = renderHeader(doc, {
    businessName: business?.name || 'Business Name',
    businessAddress: business?.address,
    businessPhone: business?.phone,
    businessVat: business?.vat_number,
    businessReg: business?.registration_number,
    documentTitle: isCn ? 'Credit note' : 'Invoice',
    documentNumber: `#${invoice.invoice_number}`,
    orderNumber: invoice.order_number,
    status: invoice.status,
    statusColors,
    logo,
  }, config);

  // ── Customer Section ──
  y = renderCustomerSection(doc, {
    customerName: invoice.customer_name,
    customerEmail: invoice.customer_email,
    customerAddress: invoice.customer_address,
    customerVat: invoice.customer_vat_number,
    deliveryAddress: invoice.delivery_address,
    deliveryConditions: invoice.delivery_conditions,
  }, y, config);

  // ── Dates & Terms ──
  y = renderDatesRow(doc, {
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    terms: invoice.terms,
  }, y, config);

  // ── Line Items ──
  const mappedItems = lineItems.map((item) => ({
    sku: item.sku,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    total: Number(item.total),
  }));
  y = renderLineItemsTable(doc, mappedItems, y, curr, config);

  // ── Totals ──
  const subtotalFromLines = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const subtotal = lineItems.length > 0 ? subtotalFromLines : Number(invoice.subtotal) || 0;
  const vatRate = Number(invoice.tax_rate) || 0;
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  y = renderTotalsSection(doc, {
    subtotal,
    vatRate,
    vatAmount,
    total,
    currency: curr,
    bankingDetails: business?.banking_details,
  }, y, config);

  // ── Notes (credit reference + user notes) ──
  const notesParts: string[] = [];
  if (isCn && creditedInvoiceNumber) {
    notesParts.push(`This credit note relates to invoice #${creditedInvoiceNumber}.`);
  }
  if (invoice.notes?.trim()) notesParts.push(invoice.notes.trim());
  const notesCombined = notesParts.join('\n\n');
  if (notesCombined) {
    y = renderNotesSection(doc, notesCombined, y, config);
  }

  // ── Signature ──
  renderSignatureSection(doc, y, config);

  // ── Footer ──
  renderFooter(doc, config);

  const safeNum = String(invoice.invoice_number).replace(/[^\w.-]+/g, '-');
  doc.save(isCn ? `credit-note-${safeNum}.pdf` : `invoice-${safeNum}.pdf`);
}
