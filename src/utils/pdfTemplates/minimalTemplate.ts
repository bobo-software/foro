/**
 * Minimal template — clean, spacious layout with subtle lines and lots of whitespace.
 */

import type { jsPDF } from 'jspdf';
import type { DocumentTemplateConfig } from '../../types/documentTemplate';
import { formatCurrency } from '../currency';
import {
  PDF, addLogo,
  type PdfTemplateFunctions,
  type HeaderData, type CustomerData, type DatesData,
  type LineItem, type TotalsData,
} from './types';

export const minimalTemplate: PdfTemplateFunctions = {

  // ──────────────────────────────────────────────────────────────── Header ──
  renderHeader(doc: jsPDF, data: HeaderData, config: DocumentTemplateConfig): number {
    const { margin, rightEdge } = PDF;
    let y = margin + 2;

    // Logo (left position for minimal)
    if (data.logo) {
      const dims = addLogo(doc, data.logo, margin, y - 2, config.logoMaxWidth, config.logoMaxHeight);
      y += dims.h + 4;
    }

    // Business name — understated
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.primaryColor);
    doc.text(data.businessName, margin, y);
    y += 5;

    // Contact details in a single line
    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    const details: string[] = [];
    if (data.businessPhone) details.push(data.businessPhone);
    if (data.businessVat) details.push(`VAT: ${data.businessVat}`);
    if (data.businessReg) details.push(`Reg: ${data.businessReg}`);
    if (details.length > 0) {
      doc.text(details.join('  |  '), margin, y);
      y += 4;
    }
    if (data.businessAddress) {
      doc.text(data.businessAddress.replace(/\n/g, ', '), margin, y);
      y += 4;
    }

    // Right side: document title and number
    let rightY = margin + 2;
    doc.setFontSize(22);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.primaryColor);
    doc.text(data.documentTitle.toUpperCase(), rightEdge, rightY, { align: 'right' });
    rightY += 8;

    doc.setFontSize(10);
    doc.setTextColor(...config.textColor);
    doc.text(data.documentNumber, rightEdge, rightY, { align: 'right' });
    rightY += 5;

    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    if (data.orderNumber) {
      doc.text(`Order: ${data.orderNumber}`, rightEdge, rightY, { align: 'right' });
      rightY += 4;
    }

    // Status — small, subtle
    if (data.status && data.statusColors) {
      rightY += 2;
      const color = data.statusColors[data.status] || [100, 100, 100];
      doc.setTextColor(...color);
      doc.setFontSize(8);
      doc.text(data.status.toUpperCase(), rightEdge, rightY, { align: 'right' });
    }

    y = Math.max(y, rightY) + 10;
    return y;
  },

  // ──────────────────────────────────────────────────────── Customer Info ──
  renderCustomerSection(doc: jsPDF, data: CustomerData, y: number, config: DocumentTemplateConfig): number {
    const { margin, middleX } = PDF;
    const lh = PDF.lineHeight;
    const customerRightX = middleX + 10;
    let customerY = y;
    let deliveryY = y;

    // Bill To — subtle label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
    doc.text('BILL TO', margin, customerY);
    customerY += lh;

    doc.setFontSize(10);
    doc.setTextColor(...config.textColor);
    doc.text(data.customerName, margin, customerY);
    customerY += lh;

    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    if (data.customerVat) {
      doc.text(`VAT: ${data.customerVat}`, margin, customerY);
      customerY += 4;
    }
    if (data.customerAddress) {
      const lines = doc.splitTextToSize(data.customerAddress, 70);
      doc.text(lines, margin, customerY);
      customerY += lines.length * 3.5;
    }
    if (data.customerEmail) {
      doc.text(data.customerEmail, margin, customerY);
      customerY += 4;
    }

    // Deliver To
    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    doc.text('DELIVER TO', customerRightX, deliveryY);
    deliveryY += lh;

    doc.setFontSize(8);
    if (data.deliveryAddress) {
      const lines = doc.splitTextToSize(data.deliveryAddress, 70);
      doc.text(lines, customerRightX, deliveryY);
      deliveryY += lines.length * 3.5;
    } else {
      doc.text('Same as billing address', customerRightX, deliveryY);
      deliveryY += 4;
    }
    if (data.deliveryConditions) {
      deliveryY += 2;
      doc.setTextColor(...config.textColor);
      const label = data.deliveryConditions === 'collect' ? 'COLLECT' : 'DELIVER';
      doc.text(label, customerRightX, deliveryY);
    }

    y = Math.max(customerY, deliveryY) + 8;
    return y;
  },

  // ──────────────────────────────────────────────────────── Dates & Terms ──
  renderDatesRow(doc: jsPDF, data: DatesData, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;
    const colW = contentWidth / 3;

    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    doc.setFont('helvetica', 'normal');

    doc.text(`Issue: ${new Date(data.issueDate).toLocaleDateString()}`, margin, y);
    if (data.dueDate) {
      doc.text(`Due: ${new Date(data.dueDate).toLocaleDateString()}`, margin + colW, y);
    }
    if (data.validUntil) {
      doc.text(`Valid until: ${new Date(data.validUntil).toLocaleDateString()}`, margin + colW, y);
    }
    if (data.terms) {
      doc.text(`Terms: ${data.terms}`, margin + colW * 2, y);
    }

    y += lh + 8;

    // Subtle separator
    doc.setDrawColor(...config.secondaryTextColor);
    doc.setLineWidth(0.15);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;

    return y;
  },

  // ──────────────────────────────────────────────────── Line Items Table ──
  renderLineItemsTable(doc: jsPDF, items: LineItem[], y: number, currency: string, config: DocumentTemplateConfig): number {
    if (items.length === 0) return y;

    const { margin } = PDF;
    const colWidths = [25, 70, 20, 30, 35];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const colStart = (i: number) => margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);

    // Header — just text, no background
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...config.tableHeaderText);
    doc.text('SKU', colStart(0) + 2, y + 4);
    doc.text('DESCRIPTION', colStart(1) + 2, y + 4);
    doc.text('QTY', colStart(2) + 2, y + 4);
    doc.text('UNIT PRICE', colStart(3) + 2, y + 4);
    doc.text('TOTAL', colStart(4) + 2, y + 4);

    y += 6;
    // Thin line under header
    doc.setDrawColor(...config.secondaryTextColor);
    doc.setLineWidth(0.15);
    doc.line(margin, y, margin + tableWidth, y);
    y += 3;

    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
      const rowY = y;

      doc.setFontSize(9);
      doc.setTextColor(...config.textColor);
      const sku = item.sku || '\u2014';
      doc.text(sku.slice(0, 12), colStart(0) + 2, rowY + 4);
      doc.text(String(item.description).slice(0, 38), colStart(1) + 2, rowY + 4);
      doc.text(item.unitType === 'hrs' ? `${item.quantity} hrs` : String(item.quantity), colStart(2) + 2, rowY + 4);
      doc.text(formatCurrency(item.unitPrice, currency), colStart(3) + 2, rowY + 4);
      doc.text(formatCurrency(item.total, currency), colStart(4) + 2, rowY + 4);

      y += 7;

      // Subtle bottom line per row
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y, margin + tableWidth, y);
    });

    y += 10;
    return y;
  },

  // ──────────────────────────────────────────────────── Totals & Banking ──
  renderTotalsSection(doc: jsPDF, data: TotalsData, y: number, config: DocumentTemplateConfig): number {
    const { margin, rightEdge } = PDF;
    const lh = PDF.lineHeight;
    let bankingY = y;
    let totalsY = y;

    // Left: Banking details
    if (data.bankingDetails) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...config.secondaryTextColor);
      doc.text('BANKING DETAILS', margin, bankingY);
      bankingY += lh;

      const lines = doc.splitTextToSize(data.bankingDetails, 70);
      doc.text(lines, margin, bankingY);
      bankingY += lines.length * 3.5;
    }

    // Right: Totals — clean numbers
    const totalsWidth = 70;
    const totalsLabelX = rightEdge - totalsWidth;

    doc.setFontSize(9);
    doc.setTextColor(...config.secondaryTextColor);
    doc.setFont('helvetica', 'normal');

    doc.text('Subtotal', totalsLabelX, totalsY);
    doc.setTextColor(...config.textColor);
    doc.text(formatCurrency(data.subtotal, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += lh;

    if (data.showVat !== false) {
      doc.setTextColor(...config.secondaryTextColor);
      doc.text(`VAT (${data.vatRate}%)`, totalsLabelX, totalsY);
      doc.setTextColor(...config.textColor);
      doc.text(formatCurrency(data.vatAmount, data.currency), rightEdge, totalsY, { align: 'right' });
      totalsY += lh;
    }
    totalsY += 3;

    // Thin separator
    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.3);
    doc.line(totalsLabelX, totalsY - 1, rightEdge, totalsY - 1);
    totalsY += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...config.primaryColor);
    doc.text('Total', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.total, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += 4;

    return Math.max(bankingY, totalsY) + 10;
  },

  // ──────────────────────────────────────────────────────────────── Notes ──
  renderNotesSection(doc: jsPDF, notes: string, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    doc.text('NOTES', margin, y);
    y += lh;

    doc.setFontSize(9);
    doc.setTextColor(...config.textColor);
    const lines = doc.splitTextToSize(notes, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 8;
    return y;
  },

  // ──────────────────────────────────────────────────────── Signature ──
  renderSignatureSection(doc: jsPDF, y: number, config: DocumentTemplateConfig): number {
    const { margin, rightEdge } = PDF;

    if (y > 240) {
      doc.addPage();
      y = margin;
    }
    y = Math.max(y, 232);

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(margin, y, rightEdge, y);
    y += 10;

    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    doc.setFont('helvetica', 'normal');

    const sigLineWidth = 50;
    const sigGap = 20;
    const sigStartX = margin + 10;

    doc.text('Full Name & Surname:', sigStartX, y);
    doc.setDrawColor(200, 200, 200);
    doc.line(sigStartX + 40, y + 1, sigStartX + 40 + sigLineWidth, y + 1);

    const dateFieldX = sigStartX + 40 + sigLineWidth + sigGap;
    doc.text('Date:', dateFieldX, y);
    doc.line(dateFieldX + 15, y + 1, dateFieldX + 15 + 40, y + 1);

    const signFieldX = dateFieldX + 15 + 40 + sigGap;
    doc.text('Signature:', signFieldX, y);
    doc.line(signFieldX + 22, y + 1, rightEdge - 5, y + 1);

    return y + 10;
  },

  // ──────────────────────────────────────────────────────────── Footer ──
  renderFooter(doc: jsPDF, config: DocumentTemplateConfig): void {
    const y = PDF.pageHeight - 10;
    doc.setFontSize(7);
    doc.setTextColor(...config.secondaryTextColor);
    doc.text('Foro by Bobo Softwares (2026)', PDF.middleX, y, { align: 'center' });
  },
};
