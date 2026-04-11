import type { Business } from '../types/business';
import { getTemplateConfig } from '../types/documentTemplate';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { formatCurrency } from './currency';
import { PDF as PdfConst, addLogo } from './pdfTemplates/types';

export interface StatementRow {
  date: string;
  type: 'invoice' | 'payment' | 'credit_note';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  currency: string;
}

/**
 * Generate a statement of account PDF using the active template's color scheme.
 * Statements are simpler than invoices/quotations — a title, date range, and data table.
 */
export async function generateStatementPdf(
  companyName: string,
  fromDate: string,
  toDate: string,
  rows: StatementRow[],
  currency: string = 'ZAR',
  business?: Business | null,
  scopeLabel?: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const config = getTemplateConfig(business?.document_template);
  const margin = PdfConst.margin;
  const rightEdge = PdfConst.rightEdge;
  const middleX = PdfConst.middleX;
  const lh = PdfConst.lineHeight;
  let y = margin;

  // ── Optional accent bar (modern) ──
  if (config.accentBar) {
    doc.setFillColor(...config.primaryColor);
    doc.rect(0, 0, PdfConst.pageWidth, config.accentBarHeight, 'F');
    y = config.accentBarHeight + 6;
  }

  // ── Logo ──
  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  if (showLogo) {
    const logo = await fetchLogoAsBase64(business!.logo_url!);
    if (logo) {
      if (config.logoPosition === 'right') {
        addLogo(doc, logo, rightEdge - config.logoMaxWidth, y - 2, config.logoMaxWidth, config.logoMaxHeight);
      } else {
        const dims = addLogo(doc, logo, margin, y - 2, config.logoMaxWidth, config.logoMaxHeight);
        y += dims.h + 3;
      }
    }
  }

  // ── Title ──
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...config.primaryColor);
  doc.text('Statement of Account', margin, y);
  y += lh + 2;

  // ── Meta info ──
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...config.textColor);
  doc.text(`Company: ${companyName}`, margin, y);
  y += lh;
  doc.setTextColor(...config.secondaryTextColor);
  doc.text(`From: ${fromDate}  To: ${toDate}`, margin, y);
  doc.text(`Currency: ${currency}`, margin + 100, y);
  y += lh + 6;
  if (scopeLabel) {
    doc.text(`Scope: ${scopeLabel}`, margin, y);
    y += lh + 4;
  }

  // Separator
  doc.setDrawColor(...config.primaryColor);
  doc.setLineWidth(config.accentBar ? 0.8 : 0.4);
  doc.line(margin, y, rightEdge, y);
  y += 6;

  // ── Table header ──
  const colDate = margin;
  const colType = margin + 28;
  const colRef = margin + 50;
  const colDebit = margin + 95;
  const colCredit = margin + 125;
  const colBalance = margin + 155;

  // Header background
  const headerH = 8;
  doc.setFillColor(...config.tableHeaderBg);
  doc.rect(margin, y, PdfConst.contentWidth, headerH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...config.tableHeaderText);
  doc.text('Date', colDate + 2, y + 5);
  doc.text('Type', colType + 2, y + 5);
  doc.text('Reference', colRef + 2, y + 5);
  doc.text('Debit', colDebit + 2, y + 5);
  doc.text('Credit', colCredit + 2, y + 5);
  doc.text('Balance', colBalance + 2, y + 5);
  y += headerH;

  doc.setFont('helvetica', 'normal');

  // ── Table rows ──
  const rowH = 7;
  rows.forEach((row, idx) => {
    if (row.currency !== currency) return;

    if (config.tableAlternateRows && idx % 2 === 1) {
      doc.setFillColor(...config.tableAlternateRowBg);
      doc.rect(margin, y, PdfConst.contentWidth, rowH, 'F');
    }

    const dateStr = new Date(row.date).toLocaleDateString();
    doc.setFontSize(9);
    doc.setTextColor(...config.textColor);
    doc.text(dateStr, colDate + 2, y + 5);
    const typeLabel =
      row.type === 'invoice' ? 'Invoice' : row.type === 'credit_note' ? 'Credit note' : 'Payment';
    doc.text(typeLabel, colType + 2, y + 5);
    doc.text(String(row.reference).slice(0, 18), colRef + 2, y + 5);
    doc.text(row.debit > 0 ? formatCurrency(row.debit, currency) : '', colDebit + 2, y + 5);
    doc.text(row.credit > 0 ? formatCurrency(row.credit, currency) : '', colCredit + 2, y + 5);
    doc.text(formatCurrency(row.balance, currency), colBalance + 2, y + 5);
    y += rowH;
  });

  y += 4;

  // Bottom line
  doc.setDrawColor(...config.primaryColor);
  doc.setLineWidth(config.accentBar ? 0.8 : 0.4);
  doc.line(margin, y, rightEdge, y);

  // ── Footer ──
  const footerY = PdfConst.pageHeight - 12;
  if (config.footerAccentLine) {
    doc.setDrawColor(...config.primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 4, rightEdge, footerY - 4);
  }
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('Foroman by Bobo Softwares (2026)', middleX, footerY, { align: 'center' });

  doc.save(`statement-${companyName.replace(/\s+/g, '-')}-${fromDate}-${toDate}.pdf`);
}
