import type { Business } from '../../types/business';
import type { DocumentTemplateConfig } from '../../types/documentTemplate';
import { getTemplateConfig } from '../../types/documentTemplate';
import { fetchLogoAsBase64 } from '../pdfLogoHelper';
import type { HeaderData, CustomerData, DatesData, LineItem, TotalsData } from './types';
import {
  renderHeader, renderCustomerSection, renderDatesRow,
  renderLineItemsTable, renderTotalsSection, renderNotesSection,
  renderSignatureSection, renderFooter,
} from './templateRenderer';

export interface StandardDocumentInput {
  header: HeaderData;
  customer: CustomerData;
  dates: DatesData;
  lineItems: LineItem[];
  totals: TotalsData;
  notes?: string;
  filename: string;
  /** Override template; defaults to business.document_template */
  templateOverride?: Parameters<typeof getTemplateConfig>[0];
}

export function computePdfTotals(
  lineItems: { total?: number | string | null }[],
  subtotalFallback: number | string | null,
  taxRate: number | string | null
): TotalsData & { currency: string } {
  const subtotalFromLines = lineItems.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const subtotal = lineItems.length > 0 ? subtotalFromLines : Number(subtotalFallback) || 0;
  const vatRate = Number(taxRate) || 0;
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;
  return { subtotal, vatRate, vatAmount, total, currency: '' };
}

export async function generateStandardDocumentPdf(
  input: StandardDocumentInput,
  business?: Business | null,
  configOverride?: Partial<DocumentTemplateConfig>
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const base = getTemplateConfig(input.templateOverride ?? business?.document_template);
  const config: DocumentTemplateConfig = configOverride ? { ...base, ...configOverride } : base;

  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business!.logo_url!) : null;
  const showVat = business?.tax_enabled ?? true;
  const showCustomerVat = showVat && !!business?.vat_number;

  const headerWithLogo: HeaderData = { ...input.header, logo };
  const customer: CustomerData = showCustomerVat ? input.customer : { ...input.customer, customerVat: undefined };
  const totals: TotalsData = showVat
    ? input.totals
    : { ...input.totals, vatRate: 0, vatAmount: 0, total: input.totals.subtotal, showVat: false };

  let y = renderHeader(doc, headerWithLogo, config);
  y = renderCustomerSection(doc, customer, y, config);
  y = renderDatesRow(doc, input.dates, y, config);
  y = renderLineItemsTable(doc, input.lineItems, y, totals.currency, config);
  y = renderTotalsSection(doc, totals, y, config);

  if (input.notes) {
    y = renderNotesSection(doc, input.notes, y, config);
  }

  renderSignatureSection(doc, y, config);
  renderFooter(doc, config);

  doc.save(input.filename);
}
