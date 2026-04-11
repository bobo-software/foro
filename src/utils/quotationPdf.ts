import type { Quotation, QuotationLine } from '../types/quotation';
import { useQuotationStore } from '../stores/data/QuotationStore';
import type { Business } from '../types/business';
import { getTemplateConfig } from '../types/documentTemplate';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import {
  renderHeader, renderCustomerSection, renderDatesRow,
  renderLineItemsTable, renderTotalsSection, renderNotesSection,
  renderSignatureSection, renderFooter,
} from './pdfTemplates/templateRenderer';
import { useBusinessStore } from '../stores/data/BusinessStore';

/** Fetch quotation + line items by id, then download PDF. Use from list view. */
export async function downloadQuotationPdfById(quotationId: number): Promise<void> {
  const { quotation, lines } = await useQuotationStore.getState().fetchQuotationWithLines(quotationId);
  if (!quotation) throw new Error('Quotation not found');
  const business = useBusinessStore.getState().currentBusiness;
  await generateQuotationPdf(quotation, lines, business);
}

export async function generateQuotationPdf(
  quotation: Quotation,
  lineItems: QuotationLine[] = [],
  business?: Business | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Resolve template config from business preferences
  const config = getTemplateConfig(business?.document_template);
  const curr = quotation.currency || 'ZAR';

  // Fetch logo if enabled
  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business.logo_url!) : null;

  // Status color map for quotations
  const statusColors: Record<string, [number, number, number]> = {
    draft: [100, 100, 100],
    sent: [59, 130, 246],
    accepted: [34, 197, 94],
    declined: [239, 68, 68],
    expired: [156, 163, 175],
    converted: [139, 92, 246],
  };

  // ── Header ──
  let y = renderHeader(doc, {
    businessName: business?.name || 'Business Name',
    businessAddress: business?.address,
    businessPhone: business?.phone,
    businessVat: business?.vat_number,
    businessReg: business?.registration_number,
    documentTitle: 'Quotation',
    documentNumber: `#${quotation.quotation_number}`,
    orderNumber: quotation.order_number,
    status: quotation.status,
    statusColors,
    logo,
  }, config);

  // ── Customer Section ──
  y = renderCustomerSection(doc, {
    customerName: quotation.customer_name,
    customerEmail: quotation.customer_email,
    customerAddress: quotation.customer_address,
    customerVat: quotation.customer_vat_number,
    deliveryAddress: quotation.delivery_address,
    deliveryConditions: quotation.delivery_conditions,
  }, y, config);

  // ── Dates & Terms ──
  y = renderDatesRow(doc, {
    issueDate: quotation.issue_date,
    validUntil: quotation.valid_until,
    terms: quotation.terms,
  }, y, config);

  // ── Line Items ──
  const mappedItems = lineItems.map((item) => ({
    sku: item.sku,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    total: Number(item.total),
    unitType: item.unit_type ?? 'qty',
  }));
  y = renderLineItemsTable(doc, mappedItems, y, curr, config);

  // ── Totals ──
  const subtotalFromLines = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const subtotal = lineItems.length > 0 ? subtotalFromLines : Number(quotation.subtotal) || 0;
  const vatRate = Number(quotation.tax_rate) || 0;
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

  // ── Notes ──
  if (quotation.notes) {
    y = renderNotesSection(doc, quotation.notes, y, config);
  }

  // ── Signature ──
  renderSignatureSection(doc, y, config);

  // ── Footer ──
  renderFooter(doc, config);

  doc.save(`quotation-${quotation.quotation_number}.pdf`);
}
