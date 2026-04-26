import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface InvoiceLineItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface InvoiceRenderData {
  invoice_number: string;
  issued_at: string;
  order_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  shop_name: string;
  shop_owner: string;
  shop_email: string;
  shop_gstin?: string;
  buyer_gstin?: string;
  items: InvoiceLineItem[];
  total_amount: number;
}

const BRAND = '#2563eb';
const DARK = '#1e293b';
const MUTED = '#64748b';
const LIGHT = '#f8fafc';
const DIVIDER = '#e2e8f0';

@Injectable()
export class InvoicePdfService {
  private toBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    return new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });
  }

  async generateCustomerInvoice(data: InvoiceRenderData): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'INVOICE');
    this.billingBlock(doc, data, 70);
    this.itemsTable(doc, data.items);
    this.totalRow(doc, data.total_amount);
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async generateDealerInvoice(data: InvoiceRenderData): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'DEALER INVOICE');
    this.billingBlock(doc, data, 70);
    this.itemsTable(doc, data.items);
    this.totalRow(doc, data.total_amount);
    doc
      .moveDown(0.5)
      .fontSize(8)
      .fillColor(MUTED)
      .text('This invoice is issued to an authorised dealer. Prices reflect the agreed dealer rate.', { align: 'center' });
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async generateGstInvoice(data: InvoiceRenderData): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'GST TAX INVOICE');
    this.gstParticulars(doc, data);
    this.billingBlock(doc, data, doc.y + 10);
    this.gstItemsTable(doc, data.items, data.total_amount);
    this.footer(doc);
    return this.toBuffer(doc);
  }

  // ── Shared sections ────────────────────────────────────────────────────────

  private header(doc: PDFKit.PDFDocument, data: InvoiceRenderData, title: string) {
    // Brand strip
    doc.rect(0, 0, doc.page.width, 8).fill(BRAND);

    doc
      .fontSize(18).fillColor(DARK).font('Helvetica-Bold')
      .text('E VISION PVT. LTD.', 50, 28);
    doc
      .fontSize(9).fillColor(MUTED).font('Helvetica')
      .text(data.shop_name, 50, doc.y + 2);

    // Right: invoice meta
    const rightX = doc.page.width - 230;
    doc.fontSize(16).fillColor(BRAND).font('Helvetica-Bold').text(title, rightX, 28, { width: 180, align: 'right' });
    doc.fontSize(9).fillColor(DARK).font('Helvetica');
    doc.text(`Invoice #: ${data.invoice_number}`, rightX, doc.y + 4, { width: 180, align: 'right' });
    doc.text(`Date: ${new Date(data.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, rightX, doc.y + 2, { width: 180, align: 'right' });
    doc.text(`Order: ${data.order_id.slice(0, 18)}…`, rightX, doc.y + 2, { width: 180, align: 'right' });

    this.hLine(doc, 120);
    doc.y = 130;
  }

  private gstParticulars(doc: PDFKit.PDFDocument, data: InvoiceRenderData) {
    const y = doc.y;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('SELLER GSTIN', 50, y);
    doc.fillColor(DARK).font('Helvetica').text(data.shop_gstin || 'Not Registered', 50, y + 10);

    if (data.buyer_gstin) {
      doc.fillColor(MUTED).font('Helvetica-Bold').text('BUYER GSTIN', 300, y);
      doc.fillColor(DARK).font('Helvetica').text(data.buyer_gstin, 300, y + 10);
    }

    doc.y = y + 28;
    this.hLine(doc, doc.y);
    doc.y += 10;
  }

  private billingBlock(doc: PDFKit.PDFDocument, data: InvoiceRenderData, startY: number) {
    doc.y = startY;
    const mid = doc.page.width / 2;

    // From
    doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('FROM', 50, startY);
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(data.shop_name, 50, startY + 12);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica');
    if (data.shop_owner) doc.text(data.shop_owner, 50, doc.y + 2);
    if (data.shop_email) doc.text(data.shop_email, 50, doc.y + 2);

    // To
    doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('BILL TO', mid, startY);
    doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text(data.customer_name, mid, startY + 12);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica');
    if (data.customer_phone) doc.text(data.customer_phone, mid, doc.y + 2);
    if (data.customer_email) doc.text(data.customer_email, mid, doc.y + 2);

    doc.y = startY + 72;
    this.hLine(doc, doc.y);
    doc.y += 14;
  }

  private itemsTable(doc: PDFKit.PDFDocument, items: InvoiceLineItem[]) {
    const cols = { item: 50, desc: 170, qty: 340, unit: 410, total: 490 };
    const tableTop = doc.y;

    // Header
    doc.rect(50, tableTop, doc.page.width - 100, 20).fill(LIGHT);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica-Bold');
    doc.text('#', cols.item + 2, tableTop + 6);
    doc.text('Description', cols.desc + 2, tableTop + 6);
    doc.text('Qty', cols.qty + 2, tableTop + 6, { width: 60, align: 'right' });
    doc.text('Unit Price', cols.unit + 2, tableTop + 6, { width: 70, align: 'right' });
    doc.text('Total', cols.total + 2, tableTop + 6, { width: 45, align: 'right' });

    let y = tableTop + 24;
    doc.font('Helvetica').fillColor(DARK).fontSize(9);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (i % 2 === 1) doc.rect(50, y - 3, doc.page.width - 100, 17).fill('#f1f5f9');
      doc.fillColor(DARK);
      doc.text(String(i + 1), cols.item + 2, y);
      doc.text(item.product_name.slice(0, 32), cols.desc + 2, y, { width: 165 });
      doc.text(String(item.quantity), cols.qty + 2, y, { width: 60, align: 'right' });
      doc.text(this.inr(item.unit_price), cols.unit + 2, y, { width: 70, align: 'right' });
      doc.text(this.inr(item.line_total), cols.total + 2, y, { width: 45, align: 'right' });
      y += 17;
    }
    doc.y = y + 4;
    this.hLine(doc, doc.y);
    doc.y += 4;
  }

  private gstItemsTable(doc: PDFKit.PDFDocument, items: InvoiceLineItem[], total: number) {
    // Assumes 18% inclusive GST (intra-state: CGST 9% + SGST 9%; IGST column shown as ₹0 for same-state supply)
    const cols = { desc: 48, hsn: 168, qty: 218, taxable: 258, igst: 318, cgst: 368, sgst: 418, line: 478 };
    const tableTop = doc.y;

    doc.rect(50, tableTop, doc.page.width - 100, 22).fill(LIGHT);
    doc.fillColor(MUTED).fontSize(6).font('Helvetica-Bold');
    doc.text('Description', cols.desc + 2, tableTop + 8, { width: 115 });
    doc.text('HSN', cols.hsn + 2, tableTop + 8, { width: 42 });
    doc.text('Qty', cols.qty + 2, tableTop + 8, { width: 36, align: 'right' });
    doc.text('Taxable', cols.taxable + 2, tableTop + 8, { width: 52, align: 'right' });
    doc.text('IGST', cols.igst + 2, tableTop + 8, { width: 44, align: 'right' });
    doc.text('CGST 9%', cols.cgst + 2, tableTop + 8, { width: 44, align: 'right' });
    doc.text('SGST 9%', cols.sgst + 2, tableTop + 8, { width: 44, align: 'right' });
    doc.text('Total', cols.line + 2, tableTop + 8, { width: 40, align: 'right' });

    let y = tableTop + 26;
    doc.font('Helvetica').fillColor(DARK).fontSize(7);
    let sumTaxable = 0, sumIgst = 0, sumCgst = 0, sumSgst = 0;

    for (const item of items) {
      const taxable = Number(item.line_total) / 1.18;
      const cgst = taxable * 0.09;
      const sgst = taxable * 0.09;
      const igst = 0;
      sumTaxable += taxable; sumIgst += igst; sumCgst += cgst; sumSgst += sgst;

      doc.text(item.product_name.slice(0, 22), cols.desc + 2, y, { width: 115 });
      doc.text('85044090', cols.hsn + 2, y, { width: 42 });
      doc.text(String(item.quantity), cols.qty + 2, y, { width: 36, align: 'right' });
      doc.text(this.inr(taxable, true), cols.taxable + 2, y, { width: 52, align: 'right' });
      doc.text(this.inr(igst, true), cols.igst + 2, y, { width: 44, align: 'right' });
      doc.text(this.inr(cgst, true), cols.cgst + 2, y, { width: 44, align: 'right' });
      doc.text(this.inr(sgst, true), cols.sgst + 2, y, { width: 44, align: 'right' });
      doc.text(this.inr(item.line_total), cols.line + 2, y, { width: 40, align: 'right' });
      y += 15;
    }

    this.hLine(doc, y);
    y += 5;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(DARK);
    doc.text('TOTAL', cols.desc + 2, y);
    doc.text(this.inr(sumTaxable, true), cols.taxable + 2, y, { width: 52, align: 'right' });
    doc.text(this.inr(sumIgst, true), cols.igst + 2, y, { width: 44, align: 'right' });
    doc.text(this.inr(sumCgst, true), cols.cgst + 2, y, { width: 44, align: 'right' });
    doc.text(this.inr(sumSgst, true), cols.sgst + 2, y, { width: 44, align: 'right' });
    doc.text(this.inr(total), cols.line + 2, y, { width: 40, align: 'right' });
    doc.y = y + 22;

    doc.fontSize(7).fillColor(MUTED).font('Helvetica')
      .text(
        'Total taxable value, total tax (IGST / CGST / SGST), and grand total as above. Intra-state: IGST ₹0.',
        50,
        doc.y,
        { width: doc.page.width - 100 },
      );
    doc.y += 16;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
      .text(`Amount in words: ${this.toWords(Math.round(total))} Rupees Only`, 50, doc.y, { align: 'left' });
    doc.y += 14;
  }

  private totalRow(doc: PDFKit.PDFDocument, total: number) {
    const rightX = doc.page.width - 200;
    doc.rect(rightX, doc.y, 150, 24).fill(BRAND);
    doc.fontSize(11).fillColor('#fff').font('Helvetica-Bold');
    doc.text('TOTAL', rightX + 8, doc.y + 7);
    doc.text(this.inr(total), rightX + 8, doc.y - 11, { width: 134, align: 'right' });
    doc.y += 38;
  }

  private footer(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 50;
    this.hLine(doc, bottom);
    doc.fontSize(7).fillColor(MUTED).font('Helvetica')
      .text('Computer-generated document — no signature required.  |  E Vision Pvt. Ltd.', 50, bottom + 8, {
        align: 'center', width: doc.page.width - 100,
      });
  }

  private hLine(doc: PDFKit.PDFDocument, y: number) {
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor(DIVIDER).lineWidth(0.5).stroke();
  }

  private inr(n: number, decimals = false): string {
    if (decimals) return `₹${Number(n).toFixed(2)}`;
    return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  }

  private toWords(n: number): string {
    if (n === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + this.toWords(n % 100) : '');
    if (n < 100000) return this.toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + this.toWords(n % 1000) : '');
    if (n < 10000000) return this.toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + this.toWords(n % 100000) : '');
    return this.toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + this.toWords(n % 10000000) : '');
  }
}
