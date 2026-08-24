/**
 * Shared data types used across all PDF template renderers.
 */

import type { jsPDF } from 'jspdf';
import type { DocumentTemplateConfig } from '../../types/documentTemplate';
import type { LogoData } from '../pdfLogoHelper';

/** Common page dimensions & helpers */
export const PDF = {
  margin: 15,
  pageWidth: 210,
  pageHeight: 297,
  lineHeight: 5,
  get contentWidth() {
    return this.pageWidth - this.margin * 2;
  },
  get rightEdge() {
    return this.pageWidth - this.margin;
  },
  get middleX() {
    return this.pageWidth / 2;
  },
};

/** Data passed to renderHeader */
export interface HeaderData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessVat?: string;
  businessReg?: string;
  documentTitle: string;        // 'Invoice' | 'Quotation' | 'Statement of Account'
  documentNumber: string;       // e.g. '#0001'
  orderNumber?: string;
  status?: string;
  statusColors?: Record<string, [number, number, number]>;
  logo?: LogoData | null;
}

/** Data passed to renderCustomerSection */
export interface CustomerData {
  customerName: string;
  customerEmail?: string;
  customerAddress?: string;
  customerVat?: string;
  deliveryAddress?: string;
  deliveryConditions?: string;
}

/** Data passed to renderDatesRow */
export interface DatesData {
  issueDate: string;
  dueDate?: string;
  validUntil?: string;
  terms?: string;
}

/** Line item for the table */
export interface LineItem {
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unitType?: 'qty' | 'hrs';
}

/** Data passed to renderTotalsSection */
export interface TotalsData {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  bankingDetails?: string;
  /** Whether to render the VAT line at all (business has tax disabled). Defaults to true when omitted. */
  showVat?: boolean;
}

/** Interface that each template module must implement */
export interface PdfTemplateFunctions {
  renderHeader(doc: jsPDF, data: HeaderData, config: DocumentTemplateConfig): number;
  renderCustomerSection(doc: jsPDF, data: CustomerData, y: number, config: DocumentTemplateConfig): number;
  renderDatesRow(doc: jsPDF, data: DatesData, y: number, config: DocumentTemplateConfig): number;
  renderLineItemsTable(doc: jsPDF, items: LineItem[], y: number, currency: string, config: DocumentTemplateConfig): number;
  renderTotalsSection(doc: jsPDF, data: TotalsData, y: number, config: DocumentTemplateConfig): number;
  renderNotesSection(doc: jsPDF, notes: string, y: number, config: DocumentTemplateConfig): number;
  renderSignatureSection(doc: jsPDF, y: number, config: DocumentTemplateConfig): number;
  renderFooter(doc: jsPDF, config: DocumentTemplateConfig): void;
}

/** Helper: draw a horizontal line */
export function drawHLine(
  doc: jsPDF,
  y: number,
  color: [number, number, number] = [180, 180, 180],
  thick = false,
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(thick ? 0.6 : 0.3);
  doc.line(PDF.margin, y, PDF.rightEdge, y);
}

/**
 * Add a logo image to the document at the given position.
 * Returns the actual width and height used in mm.
 */
export function addLogo(
  doc: jsPDF,
  logo: LogoData,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
): { w: number; h: number } {
  const aspect = logo.width / logo.height;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  doc.addImage(logo.base64, logo.format, x, y, w, h);
  return { w, h };
}
