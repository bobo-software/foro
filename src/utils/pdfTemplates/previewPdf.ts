/**
 * Generate a sample invoice PDF for a given template so the user
 * can preview what documents will look like before committing.
 *
 * Uses entirely static/fake data — no API calls needed.
 */

import type { DocumentTemplateConfig, DocumentTemplateId } from '../../types/documentTemplate';
import { getTemplateConfig } from '../../types/documentTemplate';
import {
  renderHeader, renderCustomerSection, renderDatesRow,
  renderLineItemsTable, renderTotalsSection, renderNotesSection,
  renderSignatureSection, renderFooter,
} from './templateRenderer';
import type { LineItem } from './types';

/** Static sample line items */
const SAMPLE_ITEMS: LineItem[] = [
  { sku: 'WEB-001', description: 'Website Design & Development', quantity: 1, unitPrice: 12500, total: 12500 },
  { sku: 'HOST-12', description: 'Web Hosting (12 months)', quantity: 12, unitPrice: 199, total: 2388 },
  { sku: 'SSL-001', description: 'SSL Certificate (1 year)', quantity: 1, unitPrice: 450, total: 450 },
  { sku: 'SEO-003', description: 'SEO Optimisation Package', quantity: 1, unitPrice: 3500, total: 3500 },
  { sku: 'MAINT-Q', description: 'Quarterly Maintenance Retainer', quantity: 4, unitPrice: 1250, total: 5000 },
];

const SAMPLE_SUBTOTAL = SAMPLE_ITEMS.reduce((s, i) => s + i.total, 0);
const SAMPLE_VAT_RATE = 15;
const SAMPLE_VAT = (SAMPLE_SUBTOTAL * SAMPLE_VAT_RATE) / 100;
const SAMPLE_TOTAL = SAMPLE_SUBTOTAL + SAMPLE_VAT;
const CURRENCY = 'ZAR';

/**
 * Generate and download a sample PDF for the given template.
 */
export async function generatePreviewPdf(templateId: DocumentTemplateId): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const config: DocumentTemplateConfig = getTemplateConfig(templateId);

  const statusColors: Record<string, [number, number, number]> = {
    draft: [100, 100, 100],
    sent: [59, 130, 246],
    paid: [34, 197, 94],
    overdue: [239, 68, 68],
    cancelled: [156, 163, 175],
  };

  // ── Header ──
  let y = renderHeader(doc, {
    businessName: 'Acme Solutions (Pty) Ltd',
    businessAddress: '123 Innovation Drive, Sandton, 2196',
    businessPhone: '+27 11 234 5678',
    businessVat: '4567890123',
    businessReg: '2024/123456/07',
    documentTitle: 'Invoice',
    documentNumber: '#INV-0042',
    orderNumber: 'PO-2025-007',
    status: 'sent',
    statusColors,
    logo: null,
  }, config);

  // ── Customer Section ──
  y = renderCustomerSection(doc, {
    customerName: 'Bright Spark Industries',
    customerEmail: 'accounts@brightspark.co.za',
    customerAddress: '45 Commerce Road, Cape Town, 8001',
    customerVat: '9876543210',
  }, y, config);

  // ── Dates & Terms ──
  y = renderDatesRow(doc, {
    issueDate: '2025-02-01',
    dueDate: '2025-03-03',
    terms: 'Net 30',
  }, y, config);

  // ── Line Items ──
  y = renderLineItemsTable(doc, SAMPLE_ITEMS, y, CURRENCY, config);

  // ── Totals ──
  y = renderTotalsSection(doc, {
    subtotal: SAMPLE_SUBTOTAL,
    vatRate: SAMPLE_VAT_RATE,
    vatAmount: SAMPLE_VAT,
    total: SAMPLE_TOTAL,
    currency: CURRENCY,
    bankingDetails: 'First National Bank | Acc: 62345678901 | Branch: 250655',
  }, y, config);

  // ── Notes ──
  y = renderNotesSection(doc, 'Thank you for your business! Payment is due within 30 days of the invoice date. Please use the invoice number as your payment reference.', y, config);

  // ── Signature ──
  renderSignatureSection(doc, y, config);

  // ── Footer ──
  renderFooter(doc, config);

  // Open in a new tab instead of downloading, so the user can preview without cluttering downloads
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
