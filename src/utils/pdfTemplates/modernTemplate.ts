/**
 * Modern template — bold accent bar, colored headers, professional look.
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

export const modernTemplate: PdfTemplateFunctions = {

  // ──────────────────────────────────────────────────────────────── Header ──
  renderHeader(doc: jsPDF, data: HeaderData, config: DocumentTemplateConfig): number {
    const { margin, rightEdge, pageWidth } = PDF;
    let y = 0;

    // Accent bar across top
    if (config.accentBar) {
      doc.setFillColor(...config.primaryColor);
      doc.rect(0, 0, pageWidth, config.accentBarHeight, 'F');
      y = config.accentBarHeight + 6;
    } else {
      y = margin;
    }

    // Left side: Business name & details
    const leftStartY = y;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...config.primaryColor);
    doc.text(data.businessName, margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
    if (data.businessAddress) {
      const lines = doc.splitTextToSize(data.businessAddress, 80);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }
    if (data.businessPhone) {
      doc.text(`Tel: ${data.businessPhone}`, margin, y);
      y += 4;
    }
    if (data.businessVat) {
      doc.text(`VAT: ${data.businessVat}`, margin, y);
      y += 4;
    }
    if (data.businessReg) {
      doc.text(`Reg: ${data.businessReg}`, margin, y);
      y += 4;
    }

    // Right side: Logo (top-right for modern) + document info
    let rightY = leftStartY;
    if (data.logo) {
      const dims = addLogo(
        doc, data.logo,
        rightEdge - config.logoMaxWidth, rightY - 2,
        config.logoMaxWidth, config.logoMaxHeight,
      );
      rightY += dims.h + 4;
    }

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...config.primaryColor);
    doc.text(data.documentTitle, rightEdge, rightY, { align: 'right' });
    rightY += 7;

    doc.setFontSize(11);
    doc.setTextColor(...config.textColor);
    doc.text(data.documentNumber, rightEdge, rightY, { align: 'right' });
    rightY += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
    if (data.orderNumber) {
      doc.text(`Order: ${data.orderNumber}`, rightEdge, rightY, { align: 'right' });
      rightY += 4;
    }
    doc.text('Page 1', rightEdge, rightY, { align: 'right' });

    // Status badge with color pill
    if (data.status && data.statusColors) {
      rightY += 6;
      const color = data.statusColors[data.status] || [100, 100, 100];
      doc.setFillColor(...color);
      const statusText = data.status.toUpperCase();
      const textW = doc.getStringUnitWidth(statusText) * 8 / doc.internal.scaleFactor;
      const pillX = rightEdge - textW - 10;
      doc.roundedRect(pillX, rightY - 4, textW + 8, 6, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(statusText, pillX + 4, rightY);
    }

    y = Math.max(y, rightY) + 10;

    // Separator: thin colored line
    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.8);
    doc.line(margin, y, rightEdge, y);
    y += 8;

    return y;
  },

  // ──────────────────────────────────────────────────────── Customer Info ──
  renderCustomerSection(doc: jsPDF, data: CustomerData, y: number, config: DocumentTemplateConfig): number {
    const { margin, middleX } = PDF;
    const lh = PDF.lineHeight;
    const customerRightX = middleX + 10;
    let customerY = y;
    let deliveryY = y;

    // Section label style
    doc.setTextColor(...config.primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', margin, customerY);
    customerY += lh + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...config.textColor);
    doc.text(data.customerName, margin, customerY);
    customerY += lh;

    doc.setFontSize(9);
    doc.setTextColor(...config.secondaryTextColor);
    if (data.customerVat) {
      doc.text(`VAT: ${data.customerVat}`, margin, customerY);
      customerY += 4;
    }
    if (data.customerAddress) {
      const lines = doc.splitTextToSize(data.customerAddress, 70);
      doc.text(lines, margin, customerY);
      customerY += lines.length * 4;
    }
    if (data.customerEmail) {
      doc.text(data.customerEmail, margin, customerY);
      customerY += 4;
    }

    // Right: Deliver To
    doc.setTextColor(...config.primaryColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DELIVER TO', customerRightX, deliveryY);
    deliveryY += lh + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...config.secondaryTextColor);
    if (data.deliveryAddress) {
      const lines = doc.splitTextToSize(data.deliveryAddress, 70);
      doc.text(lines, customerRightX, deliveryY);
      deliveryY += lines.length * 4;
    } else {
      doc.text('Same as billing address', customerRightX, deliveryY);
      deliveryY += 4;
    }
    if (data.deliveryConditions) {
      deliveryY += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...config.textColor);
      const label = data.deliveryConditions === 'collect' ? 'COLLECT' : 'DELIVER';
      doc.text(`Delivery: ${label}`, customerRightX, deliveryY);
    }

    y = Math.max(customerY, deliveryY) + 8;
    return y;
  },

  // ──────────────────────────────────────────────────────── Dates & Terms ──
  renderDatesRow(doc: jsPDF, data: DatesData, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;

    // Light background bar for dates
    doc.setFillColor(241, 245, 249); // Slate-100
    doc.rect(margin, y - 3, contentWidth, 10, 'F');

    doc.setFontSize(9);
    doc.setTextColor(...config.textColor);
    doc.setFont('helvetica', 'normal');

    const colW = contentWidth / 3;
    doc.text(`Issue Date: ${new Date(data.issueDate).toLocaleDateString()}`, margin + 3, y + 3);
    if (data.dueDate) {
      doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, margin + colW + 3, y + 3);
    }
    if (data.validUntil) {
      doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, margin + colW + 3, y + 3);
    }
    if (data.terms) {
      doc.text(`Terms: ${data.terms}`, margin + colW * 2 + 3, y + 3);
    }

    y += lh + 10;
    return y;
  },

  // ──────────────────────────────────────────────────── Line Items Table ──
  renderLineItemsTable(doc: jsPDF, items: LineItem[], y: number, currency: string, config: DocumentTemplateConfig): number {
    if (items.length === 0) return y;

    const { margin } = PDF;
    const colWidths = [25, 70, 20, 30, 35];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const colStart = (i: number) => margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);

    // Header row with primary color
    doc.setFillColor(...config.tableHeaderBg);
    doc.rect(margin, y, tableWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...config.tableHeaderText);
    doc.text('SKU', colStart(0) + 2, y + 5.5);
    doc.text('Description', colStart(1) + 2, y + 5.5);
    doc.text('Qty', colStart(2) + 2, y + 5.5);
    doc.text('Unit Price', colStart(3) + 2, y + 5.5);
    doc.text('Line Total', colStart(4) + 2, y + 5.5);

    y += 8;

    doc.setFont('helvetica', 'normal');

    items.forEach((item, idx) => {
      const rowY = y;
      if (config.tableAlternateRows && idx % 2 === 1) {
        doc.setFillColor(...config.tableAlternateRowBg);
        doc.rect(margin, rowY, tableWidth, 7, 'F');
      }

      doc.setFontSize(9);
      doc.setTextColor(...config.textColor);
      const sku = item.sku || '\u2014';
      doc.text(sku.slice(0, 12), colStart(0) + 2, rowY + 5);
      doc.text(String(item.description).slice(0, 38), colStart(1) + 2, rowY + 5);
      doc.text(item.unitType === 'hrs' ? `${item.quantity} hrs` : String(item.quantity), colStart(2) + 2, rowY + 5);
      doc.text(formatCurrency(item.unitPrice, currency), colStart(3) + 2, rowY + 5);
      doc.text(formatCurrency(item.total, currency), colStart(4) + 2, rowY + 5);
      y += 7;
    });

    // Bottom border line
    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + tableWidth, y);

    y += 8;
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
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...config.primaryColor);
      doc.text('BANKING DETAILS', margin, bankingY);
      bankingY += lh;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...config.secondaryTextColor);
      const lines = doc.splitTextToSize(data.bankingDetails, 70);
      doc.text(lines, margin, bankingY);
      bankingY += lines.length * 4;
    }

    // Right: Totals in a boxed area
    const totalsWidth = 75;
    const boxX = rightEdge - totalsWidth - 4;
    const totalsLabelX = rightEdge - totalsWidth;

    if (config.totalsBoxed) {
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(...config.primaryColor);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, totalsY - 4, totalsWidth + 8, 32, 2, 2, 'FD');
    }

    doc.setFontSize(10);
    doc.setTextColor(...config.textColor);
    doc.setFont('helvetica', 'normal');

    doc.text('Subtotal:', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.subtotal, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += lh;

    doc.text(`VAT (${data.vatRate}%):`, totalsLabelX, totalsY);
    doc.text(formatCurrency(data.vatAmount, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += lh + 2;

    // Total line
    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.6);
    doc.line(totalsLabelX, totalsY - 1, rightEdge, totalsY - 1);
    totalsY += 3;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...config.primaryColor);
    doc.text('Total:', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.total, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += 4;

    return Math.max(bankingY, totalsY) + 10;
  },

  // ──────────────────────────────────────────────────────────────── Notes ──
  renderNotesSection(doc: jsPDF, notes: string, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...config.primaryColor);
    doc.text('NOTES', margin, y);
    y += lh;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
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
    y = Math.max(y, 230);

    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, rightEdge, y);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(...config.secondaryTextColor);
    doc.setFont('helvetica', 'normal');

    const sigLineWidth = 50;
    const sigGap = 20;
    const sigStartX = margin + 10;

    doc.text('Full Name & Surname:', sigStartX, y);
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
    const y = PDF.pageHeight - 12;

    if (config.footerAccentLine) {
      doc.setDrawColor(...config.primaryColor);
      doc.setLineWidth(0.5);
      doc.line(PDF.margin, y - 4, PDF.rightEdge, y - 4);
    }

    doc.setFontSize(8);
    doc.setTextColor(...config.secondaryTextColor);
    doc.text('Foroman by Bobo Softwares (2026)', PDF.middleX, y, { align: 'center' });
  },
};
