import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface InvoiceLineItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  /** From product catalogue when set; used on GST table and item grid. */
  hsn_code?: string;
  /** Product id or store SKU when set. */
  sku?: string;
}

export interface InvoiceRenderData {
  invoice_number: string;
  issued_at: string;
  /** Full order id (UUID) — shown in full on PDF. */
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
  /** Multi-line ship-to from checkout snapshot (order group). */
  ship_to_lines?: string[];
  /** e.g. Paid via PayU — shown once under line items. */
  payment_note?: string;
  currency?: string;
}

const INK = '#111827';
const DARK = '#1f2937';
const MUTED = '#6b7280';
const LIGHT = '#f3f4f6';
const DIVIDER = '#d1d5db';
const RULE = '#111827';

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
    const doc = PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'Order invoice');
    this.partyBlock(doc, data, { showShopGstin: true, showBuyerGstin: false });
    this.itemsTable(doc, data.items);
    this.paymentNote(doc, data);
    this.totalRow(doc, data.total_amount, data.currency || 'INR');
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async generateDealerInvoice(data: InvoiceRenderData): Promise<Buffer> {
    const doc = PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'Dealer invoice (wholesale)');
    this.partyBlock(doc, data, { showShopGstin: true, showBuyerGstin: true });
    this.itemsTable(doc, data.items);
    this.paymentNote(doc, data);
    this.totalRow(doc, data.total_amount, data.currency || 'INR');
    doc.moveDown(0.4);
    doc
      .fontSize(8)
      .fillColor(MUTED)
      .font('Helvetica')
      .text(
        'Issued to an authorised dealer. Amounts reflect dealer (wholesale) pricing agreed for this order.',
        50,
        doc.y,
        { width: doc.page.width - 100, align: 'left' },
      );
    doc.moveDown(0.6);
    this.footer(doc);
    return this.toBuffer(doc);
  }

  async generateGstInvoice(data: InvoiceRenderData): Promise<Buffer> {
    const doc = PDFDocument({ margin: 50, size: 'A4' });
    this.header(doc, data, 'GST tax invoice');
    this.gstParticulars(doc, data);
    this.partyBlock(doc, data, { showShopGstin: false, showBuyerGstin: false });
    this.gstItemsTable(doc, data.items, data.total_amount);
    this.footer(doc);
    return this.toBuffer(doc);
  }

  // ── Shared sections ────────────────────────────────────────────────────────

  private header(doc: PDFKit.PDFDocument, data: InvoiceRenderData, title: string) {
    doc.rect(50, 32, doc.page.width - 100, 1.5).fill(RULE);

    doc.fontSize(15).fillColor(INK).font('Helvetica-Bold').text('E vision', 50, 44);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text('Marketplace order document', 50, doc.y + 2);

    const rightX = doc.page.width - 230;
    const dateStr = new Date(data.issued_at).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    doc.fontSize(11).fillColor(INK).font('Helvetica-Bold').text(title, rightX, 44, { width: 180, align: 'right' });
    doc.fontSize(8).fillColor(DARK).font('Helvetica');
    doc.text(`Invoice no. ${data.invoice_number}`, rightX, doc.y + 4, { width: 180, align: 'right' });
    doc.text(`Invoice date ${dateStr}`, rightX, doc.y + 2, { width: 180, align: 'right' });
    doc.text(`Order ID`, rightX, doc.y + 6, { width: 180, align: 'right' });
    doc.font('Helvetica').fontSize(7).fillColor(DARK).text(data.order_id, rightX, doc.y + 2, { width: 180, align: 'right' });

    this.hLine(doc, 118);
    doc.y = 128;
  }

  private gstParticulars(doc: PDFKit.PDFDocument, data: InvoiceRenderData) {
    const y = doc.y;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica-Bold').text('Seller GSTIN', 50, y);
    doc.fillColor(DARK).font('Helvetica').text(data.shop_gstin || 'Not registered', 50, y + 10);

    if (data.buyer_gstin) {
      doc.fillColor(MUTED).font('Helvetica-Bold').text('Buyer GSTIN', 300, y);
      doc.fillColor(DARK).font('Helvetica').text(data.buyer_gstin, 300, y + 10);
    }

    doc.y = y + 30;
    this.hLine(doc, doc.y);
    doc.y += 10;
  }

  private partyBlock(
    doc: PDFKit.PDFDocument,
    data: InvoiceRenderData,
    opts: { showShopGstin: boolean; showBuyerGstin: boolean },
  ) {
    const startY = doc.y;
    const mid = doc.page.width / 2;

    doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Sold by', 50, startY);
    doc.fontSize(9).fillColor(INK).font('Helvetica-Bold').text(data.shop_name, 50, startY + 11);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica');
    let yL = doc.y + 2;
    if (data.shop_owner) {
      doc.text(data.shop_owner, 50, yL);
      yL = doc.y + 2;
    }
    if (data.shop_email) {
      doc.text(data.shop_email, 50, yL);
      yL = doc.y + 2;
    }
    if (opts.showShopGstin && data.shop_gstin) {
      doc.text(`GSTIN ${data.shop_gstin}`, 50, yL);
      yL = doc.y + 2;
    }

    doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Bill to', mid, startY);
    doc.fontSize(9).fillColor(INK).font('Helvetica-Bold').text(data.customer_name, mid, startY + 11);
    doc.fontSize(8).fillColor(MUTED).font('Helvetica');
    let yR = doc.y + 2;
    if (data.customer_phone) {
      doc.text(data.customer_phone, mid, yR);
      yR = doc.y + 2;
    }
    if (data.customer_email) {
      doc.text(data.customer_email, mid, yR);
      yR = doc.y + 2;
    }
    if (opts.showBuyerGstin && data.buyer_gstin) {
      doc.text(`GSTIN ${data.buyer_gstin}`, mid, yR);
      yR = doc.y + 2;
    }

    const colBottom = Math.max(yL, yR, startY + 52);
    let y = colBottom + 8;

    if (data.ship_to_lines && data.ship_to_lines.length > 0) {
      doc.fontSize(7).fillColor(MUTED).font('Helvetica-Bold').text('Ship to', 50, y);
      y += 11;
      doc.fontSize(8).fillColor(DARK).font('Helvetica');
      for (const line of data.ship_to_lines) {
        doc.text(line, 50, y, { width: doc.page.width - 100 });
        y = doc.y + 2;
      }
    }

    doc.y = y + 10;
    this.hLine(doc, doc.y);
    doc.y += 12;
  }

  private itemsTable(doc: PDFKit.PDFDocument, items: InvoiceLineItem[]) {
    const tableTop = doc.y;
    const w = doc.page.width - 100;
    doc.rect(50, tableTop, w, 18).fill(LIGHT);
    doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold');
    doc.text('#', 54, tableTop + 6, { width: 14 });
    doc.text('Item', 72, tableTop + 6, { width: 188 });
    doc.text('SKU', 262, tableTop + 6, { width: 52 });
    doc.text('HSN', 316, tableTop + 6, { width: 44 });
    doc.text('Qty', 362, tableTop + 6, { width: 28, align: 'right' });
    doc.text('Rate', 392, tableTop + 6, { width: 52, align: 'right' });
    doc.text('Amount', 446, tableTop + 6, { width: 96, align: 'right' });

    let y = tableTop + 20;
    doc.font('Helvetica').fillColor(DARK).fontSize(8);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const rowH = 20;
      if (i % 2 === 1) doc.rect(50, y - 2, w, rowH).fill('#f9fafb');
      const hsn = (item.hsn_code && String(item.hsn_code).trim()) || '—';
      const sku = (item.sku && String(item.sku).trim()) || '—';
      doc.fillColor(DARK);
      doc.text(String(i + 1), 54, y + 3, { width: 14 });
      doc.text(item.product_name.slice(0, 48), 72, y + 3, { width: 188 });
      doc.fillColor(MUTED).text(sku.slice(0, 14), 262, y + 3, { width: 52 });
      doc.text(hsn.slice(0, 10), 316, y + 3, { width: 44 });
      doc.fillColor(DARK).text(String(item.quantity), 362, y + 3, { width: 28, align: 'right' });
      doc.text(this.inr(item.unit_price), 392, y + 3, { width: 52, align: 'right' });
      doc.font('Helvetica-Bold').text(this.inr(item.line_total), 446, y + 3, { width: 96, align: 'right' });
      doc.font('Helvetica');
      y += rowH;
    }
    doc.y = y + 6;
    this.hLine(doc, doc.y);
    doc.y += 8;
  }

  private paymentNote(doc: PDFKit.PDFDocument, data: InvoiceRenderData) {
    if (!data.payment_note) return;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica').text(data.payment_note, 50, doc.y, {
      width: doc.page.width - 100,
    });
    doc.moveDown(0.6);
  }

  private gstItemsTable(doc: PDFKit.PDFDocument, items: InvoiceLineItem[], total: number) {
    const cols = { desc: 48, hsn: 168, qty: 218, taxable: 258, igst: 318, cgst: 368, sgst: 418, line: 478 };
    const tableTop = doc.y;
    const w = doc.page.width - 100;

    doc.rect(50, tableTop, w, 22).fill(LIGHT);
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
    let sumTaxable = 0;
    let sumIgst = 0;
    let sumCgst = 0;
    let sumSgst = 0;

    for (const item of items) {
      const taxable = Number(item.line_total) / 1.18;
      const cgst = taxable * 0.09;
      const sgst = taxable * 0.09;
      const igst = 0;
      sumTaxable += taxable;
      sumIgst += igst;
      sumCgst += cgst;
      sumSgst += sgst;

      const hsnCell = (item.hsn_code && String(item.hsn_code).trim()) || '85044090';
      doc.text(item.product_name.slice(0, 22), cols.desc + 2, y, { width: 115 });
      doc.text(hsnCell, cols.hsn + 2, y, { width: 42 });
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
        'Taxable value and IGST / CGST / SGST as above. Intra-state supply: IGST shown as ₹0.',
        50,
        doc.y,
        { width: doc.page.width - 100 },
      );
    doc.y += 16;
    doc.fontSize(8).fillColor(MUTED).font('Helvetica')
      .text(`Amount in words: ${this.toWords(Math.round(total))} Rupees Only`, 50, doc.y, { align: 'left' });
    doc.y += 14;
  }

  private totalRow(doc: PDFKit.PDFDocument, total: number, currency: string) {
    const rightW = 200;
    const rightX = doc.page.width - 50 - rightW;
    doc.fontSize(9).fillColor(MUTED).font('Helvetica').text('Grand total', rightX, doc.y, { width: 90, align: 'right' });
    doc.fontSize(11).fillColor(INK).font('Helvetica-Bold').text(`${currency} ${this.inr(total)}`, rightX + 95, doc.y, {
      width: 105,
      align: 'right',
    });
    doc.moveDown(1.2);
  }

  private footer(doc: PDFKit.PDFDocument) {
    const bottom = doc.page.height - 50;
    this.hLine(doc, bottom);
    doc.fontSize(7).fillColor(MUTED).font('Helvetica')
      .text('Computer-generated document. No signature required. E vision Pvt. Ltd.', 50, bottom + 8, {
        align: 'center',
        width: doc.page.width - 100,
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
