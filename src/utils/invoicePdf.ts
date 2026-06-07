import type { Invoice, InvoiceItem } from '../types/invoice';
import { useInvoiceStore } from '../stores/data/InvoiceStore';
import InvoiceService from '../services/invoiceService';
import { isCreditNoteInvoice } from './invoiceLedger';
import type { Business } from '../types/business';
import { getTemplateConfig } from '../types/documentTemplate';
import {
  generateStandardDocumentPdf,
  computePdfTotals,
} from './pdfTemplates/generateStandardDocumentPdf';
import { useBusinessStore } from '../stores/data/BusinessStore';

const INVOICE_STATUS_COLORS: Record<string, [number, number, number]> = {
  draft: [100, 100, 100],
  sent: [59, 130, 246],
  paid: [34, 197, 94],
  overdue: [239, 68, 68],
  cancelled: [156, 163, 175],
};

/** Fetch invoice + line items by id, then download PDF. Use from list view. */
export async function downloadInvoicePdfById(invoiceId: number): Promise<void> {
  const { invoice, items } = await useInvoiceStore.getState().fetchInvoiceWithItems(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const business = useBusinessStore.getState().currentBusiness;
  await generateInvoicePdf(invoice, items, business);
}

/** Invoices always use the classic PDF layout (matches the on-screen invoice view). */
export async function generateInvoicePdf(
  invoice: Invoice,
  lineItems: InvoiceItem[] = [],
  business?: Business | null,
): Promise<void> {
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

  // Invoices use the classic template with compact typography
  const base = getTemplateConfig('classic');
  const configOverride = {
    compactTypography: true,
    logoMaxWidth: base.logoMaxWidth * 0.82,
    logoMaxHeight: base.logoMaxHeight * 0.82,
  };

  const { subtotal, vatRate, vatAmount, total } = computePdfTotals(
    lineItems,
    invoice.subtotal,
    invoice.tax_rate
  );

  const notesParts: string[] = [];
  if (isCn && creditedInvoiceNumber) {
    notesParts.push(`This credit note relates to invoice #${creditedInvoiceNumber}.`);
  }
  if (invoice.notes?.trim()) notesParts.push(invoice.notes.trim());

  const curr = invoice.currency || 'ZAR';
  const safeNum = String(invoice.invoice_number).replace(/[^\w.-]+/g, '-');

  await generateStandardDocumentPdf(
    {
      header: {
        businessName: business?.name || 'Business Name',
        businessAddress: business?.address,
        businessPhone: business?.phone,
        businessVat: business?.vat_number,
        businessReg: business?.registration_number,
        documentTitle: isCn ? 'Credit note' : 'Invoice',
        documentNumber: `#${invoice.invoice_number}`,
        orderNumber: invoice.order_number,
        status: invoice.status,
        statusColors: INVOICE_STATUS_COLORS,
      },
      customer: {
        customerName: invoice.customer_name,
        customerEmail: invoice.customer_email,
        customerAddress: invoice.customer_address,
        customerVat: invoice.customer_vat_number,
        deliveryAddress: invoice.delivery_address,
        deliveryConditions: invoice.delivery_conditions,
      },
      dates: {
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        terms: invoice.terms,
      },
      lineItems: lineItems.map((item) => ({
        sku: item.sku,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        total: Number(item.total),
      })),
      totals: { subtotal, vatRate, vatAmount, total, currency: curr, bankingDetails: business?.banking_details },
      notes: notesParts.join('\n\n') || undefined,
      filename: isCn ? `credit-note-${safeNum}.pdf` : `invoice-${safeNum}.pdf`,
      templateOverride: 'classic',
    },
    business,
    configOverride
  );
}
