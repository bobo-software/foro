/**
 * Classic template — traditional layout with bordered tables and gray tones.
 * Matches the original hardcoded PDF layout, plus optional logo support.
 */

import type { jsPDF } from 'jspdf';
import type { DocumentTemplateConfig } from '../../types/documentTemplate';
import { formatCurrency } from '../currency';
import {
  PDF, drawHLine, addLogo,
  type PdfTemplateFunctions,
  type HeaderData, type CustomerData, type DatesData,
  type LineItem, type TotalsData,
} from './types';

export const classicTemplate: PdfTemplateFunctions = {

  // ──────────────────────────────────────────────────────────────── Header ──
  renderHeader(doc: jsPDF, data: HeaderData, config: DocumentTemplateConfig): number {
    const { margin, rightEdge, middleX } = PDF;
    const lh = PDF.lineHeight;
    let y = margin;

    // ── Logo (left position for classic) ──
    let logoBottomY = y;
    if (data.logo) {
      const dims = addLogo(doc, data.logo, margin, y - 2, config.logoMaxWidth, config.logoMaxHeight);
      logoBottomY = y - 2 + dims.h + 2;
      // Shift business name below the logo
      y = logoBottomY + 1;
    }

    // Left column: Business name & address
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...config.textColor);
    doc.text(data.businessName, margin, y);
    y += lh + 1;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
    if (data.businessAddress) {
      const lines = doc.splitTextToSize(data.businessAddress, 60);
      doc.text(lines, margin, y);
      y += lines.length * 4;
    }

    // Middle column: Phone, VAT, Reg
    let headerY = data.logo ? logoBottomY + 1 : margin;
    doc.setFontSize(9);
    doc.setTextColor(...config.secondaryTextColor);
    if (data.businessPhone) {
      doc.text(`Tel: ${data.businessPhone}`, middleX - 15, headerY);
      headerY += 4;
    }
    if (data.businessVat) {
      doc.text(`VAT: ${data.businessVat}`, middleX - 15, headerY);
      headerY += 4;
    }
    if (data.businessReg) {
      doc.text(`Reg: ${data.businessReg}`, middleX - 15, headerY);
    }

    // Right column: Document title, number, order, page
    let rightY = margin;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...config.textColor);
    doc.text(data.documentTitle, rightEdge, rightY, { align: 'right' });
    rightY += 6;
    doc.setFontSize(11);
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

    // Status badge
    if (data.status && data.statusColors) {
      rightY += 5;
      const color = data.statusColors[data.status] || [100, 100, 100];
      doc.setTextColor(...color);
      doc.setFontSize(8);
      doc.text(`Status: ${data.status.toUpperCase()}`, rightEdge, rightY, { align: 'right' });
    }

    y = Math.max(y, rightY) + 8;
    drawHLine(doc, y, [180, 180, 180], true);
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

    // Left: Bill To
    doc.setTextColor(...config.textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, customerY);
    customerY += lh;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
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
    doc.setTextColor(...config.textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Deliver To:', customerRightX, deliveryY);
    deliveryY += lh;

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

    y = Math.max(customerY, deliveryY) + 6;
    drawHLine(doc, y);
    y += 6;
    return y;
  },

  // ──────────────────────────────────────────────────────── Dates & Terms ──
  renderDatesRow(doc: jsPDF, data: DatesData, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;
    const colW = contentWidth / 3;

    doc.setFontSize(9);
    doc.setTextColor(...config.textColor);
    doc.setFont('helvetica', 'normal');

    doc.text(`Issue Date: ${new Date(data.issueDate).toLocaleDateString()}`, margin, y);
    if (data.dueDate) {
      doc.text(`Due Date: ${new Date(data.dueDate).toLocaleDateString()}`, margin + colW, y);
    }
    if (data.validUntil) {
      doc.text(`Valid Until: ${new Date(data.validUntil).toLocaleDateString()}`, margin + colW, y);
    }
    if (data.terms) {
      doc.text(`Terms: ${data.terms}`, margin + colW * 2, y);
    }

    y += lh + 6;
    return y;
  },

  // ──────────────────────────────────────────────────── Line Items Table ──
  renderLineItemsTable(doc: jsPDF, items: LineItem[], y: number, currency: string, config: DocumentTemplateConfig): number {
    if (items.length === 0) return y;

    const { margin } = PDF;
    const colWidths = [25, 70, 20, 30, 35];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);
    const colStart = (i: number) => margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);

    // Header row
    doc.setFillColor(...config.tableHeaderBg);
    doc.rect(margin, y, tableWidth, 8, 'F');
    if (config.tableBorders) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, tableWidth, 8, 'S');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...config.tableHeaderText);
    doc.text('SKU', colStart(0) + 2, y + 5.5);
    doc.text('Description', colStart(1) + 2, y + 5.5);
    doc.text('Qty', colStart(2) + 2, y + 5.5);
    doc.text('Unit Price', colStart(3) + 2, y + 5.5);
    doc.text('Line Total', colStart(4) + 2, y + 5.5);

    const tableTop = y;
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.textColor);

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

    // Borders
    if (config.tableBorders) {
      doc.setDrawColor(180, 180, 180);
      doc.rect(margin, tableTop, tableWidth, y - tableTop, 'S');
    }
    if (config.tableColumnDividers) {
      doc.setDrawColor(180, 180, 180);
      for (let i = 1; i < colWidths.length; i++) {
        doc.line(colStart(i), tableTop, colStart(i), y);
      }
    }

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
      doc.setTextColor(...config.textColor);
      doc.text('Banking Details:', margin, bankingY);
      bankingY += lh;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...config.secondaryTextColor);
      const lines = doc.splitTextToSize(data.bankingDetails, 70);
      doc.text(lines, margin, bankingY);
      bankingY += lines.length * 4;
    }

    // Right: Totals
    const totalsWidth = 70;
    const totalsLabelX = rightEdge - totalsWidth;

    doc.setFontSize(10);
    doc.setTextColor(...config.textColor);
    doc.setFont('helvetica', 'normal');

    doc.text('Subtotal:', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.subtotal, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += lh;

    doc.text(`VAT (${data.vatRate}%):`, totalsLabelX, totalsY);
    doc.text(formatCurrency(data.vatAmount, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += lh;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    drawHLine(doc, totalsY - 1);
    totalsY += 3;
    doc.text('Total:', totalsLabelX, totalsY);
    doc.text(formatCurrency(data.total, data.currency), rightEdge, totalsY, { align: 'right' });
    totalsY += 2;
    drawHLine(doc, totalsY);

    return Math.max(bankingY, totalsY) + 10;
  },

  // ──────────────────────────────────────────────────────────────── Notes ──
  renderNotesSection(doc: jsPDF, notes: string, y: number, config: DocumentTemplateConfig): number {
    const { margin, contentWidth } = PDF;
    const lh = PDF.lineHeight;

    drawHLine(doc, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...config.textColor);
    doc.text('Notes:', margin, y);
    y += lh;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...config.secondaryTextColor);
    const lines = doc.splitTextToSize(notes, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 8;
    return y;
  },

  // ──────────────────────────────────────────────────────── Signature ──
  renderSignatureSection(doc: jsPDF, y: number, _config: DocumentTemplateConfig): number {
    const { margin, rightEdge } = PDF;

    if (y > 240) {
      doc.addPage();
      y = margin;
    }
    y = Math.max(y, 230);

    drawHLine(doc, y);
    y += 10;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
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
  renderFooter(doc: jsPDF, _config: DocumentTemplateConfig): void {
    const y = PDF.pageHeight - 12;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Foroman by Bobo Softwares (2026)', PDF.middleX, y, { align: 'center' });
  },
};
