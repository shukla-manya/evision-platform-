import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';
import { S3Service } from '../../common/s3/s3.service';
import { EmailService } from '../emails/email.service';
import { InvoicePdfService, InvoiceRenderData } from './invoice-pdf.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private dynamo: DynamoService,
    private s3: S3Service,
    private email: EmailService,
    private pdf: InvoicePdfService,
  ) {}

  private ordersTable() { return this.dynamo.tableName('orders'); }
  private invoicesTable() { return this.dynamo.tableName('invoices'); }
  private orderItemsTable() { return this.dynamo.tableName('order_items'); }
  private usersTable() { return this.dynamo.tableName('users'); }
  private adminsTable() { return this.dynamo.tableName('admins'); }

  async listForAdmin(adminId: string): Promise<Record<string, unknown>[]> {
    const orders = await this.dynamo.query({
      TableName: this.ordersTable(),
      IndexName: 'AdminIndex',
      KeyConditionExpression: 'admin_id = :aid',
      ExpressionAttributeValues: { ':aid': adminId },
    });
    const orderIds = orders.map((o) => o.id as string).filter(Boolean);
    if (!orderIds.length) return [];

    const invoiceLists = await Promise.all(
      orderIds.map((orderId) =>
        this.dynamo.query({
          TableName: this.invoicesTable(),
          IndexName: 'OrderIndex',
          KeyConditionExpression: 'order_id = :oid',
          ExpressionAttributeValues: { ':oid': orderId },
        }),
      ),
    );
    return invoiceLists.flat().sort(
      (a, b) =>
        new Date(String(b.issued_at || b.created_at || 0)).getTime() -
        new Date(String(a.issued_at || a.created_at || 0)).getTime(),
    );
  }

  /**
   * Full invoice generation: creates DB record, generates PDF variants,
   * uploads to S3, emails customer. Idempotent — returns existing record if PDFs already generated.
   */
  async generateWithPdf(orderId: string): Promise<Record<string, unknown>> {
    const existing = await this.dynamo.queryOne({
      TableName: this.invoicesTable(),
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': orderId },
    });
    if (existing?.customer_invoice_url) return existing as Record<string, unknown>;

    const order = await this.dynamo.get(this.ordersTable(), { id: orderId });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const [items, user, admin] = await Promise.all([
      this.dynamo.query({
        TableName: this.orderItemsTable(),
        KeyConditionExpression: 'order_id = :oid',
        ExpressionAttributeValues: { ':oid': orderId },
      }),
      this.dynamo.get(this.usersTable(), { id: String(order.user_id || '') }),
      this.dynamo.get(this.adminsTable(), { id: String(order.admin_id || '') }),
    ]);

    const now = new Date().toISOString();
    const invoiceId = existing ? String(existing.id) : uuidv4();
    const invoiceNumber = existing
      ? String(existing.invoice_number)
      : `INV-${now.slice(0, 10).replace(/-/g, '')}-${invoiceId.slice(0, 6).toUpperCase()}`;

    if (!existing) {
      await this.dynamo.put(this.invoicesTable(), {
        id: invoiceId,
        order_id: orderId,
        admin_id: String(order.admin_id || ''),
        user_id: String(order.user_id || ''),
        group_id: String(order.group_id || ''),
        total_amount: Number(order.total_amount || 0),
        currency: String(order.currency || 'INR'),
        invoice_number: invoiceNumber,
        status: 'generated',
        issued_at: now,
        created_at: now,
        updated_at: now,
      });
    }

    const renderData: InvoiceRenderData = {
      invoice_number: invoiceNumber,
      issued_at: now,
      order_id: orderId,
      customer_name: String(user?.name || 'Customer'),
      customer_phone: String(user?.phone || ''),
      customer_email: String(user?.email || ''),
      shop_name: String(admin?.shop_name || 'E Vision Shop'),
      shop_owner: String(admin?.owner_name || ''),
      shop_email: String(admin?.email || ''),
      shop_gstin: String(admin?.gstin || admin?.gst_no || ''),
      buyer_gstin: String(user?.gstin || user?.gst_no || ''),
      items: items.map((item) => ({
        product_name: String(item.product_name || 'Product'),
        quantity: Number(item.quantity || 1),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0),
      })),
      total_amount: Number(order.total_amount || 0),
    };

    const isDealer = String(user?.role || '') === 'dealer';

    const [customerBuf, dealerBuf, gstBuf] = await Promise.all([
      this.pdf.generateCustomerInvoice(renderData),
      isDealer ? this.pdf.generateDealerInvoice(renderData) : Promise.resolve(null as Buffer | null),
      isDealer ? this.pdf.generateGstInvoice(renderData) : Promise.resolve(null as Buffer | null),
    ]);

    const [customerUrl, dealerUrl, gstUrl] = await Promise.all([
      this.s3.upload(customerBuf, 'application/pdf', 'invoices'),
      dealerBuf ? this.s3.upload(dealerBuf, 'application/pdf', 'invoices') : Promise.resolve(null as string | null),
      gstBuf ? this.s3.upload(gstBuf, 'application/pdf', 'invoices') : Promise.resolve(null as string | null),
    ]);

    await this.dynamo.update(this.invoicesTable(), { id: invoiceId }, {
      customer_invoice_url: customerUrl,
      ...(dealerUrl ? { dealer_invoice_url: dealerUrl } : {}),
      ...(gstUrl ? { gst_invoice_url: gstUrl } : {}),
      updated_at: now,
    });

    const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [
      { filename: `${invoiceNumber}-customer.pdf`, content: customerBuf, contentType: 'application/pdf' },
    ];
    if (dealerBuf) attachments.push({ filename: `${invoiceNumber}-dealer.pdf`, content: dealerBuf, contentType: 'application/pdf' });
    if (gstBuf) attachments.push({ filename: `${invoiceNumber}-gst.pdf`, content: gstBuf, contentType: 'application/pdf' });

    if (user?.email) {
      this.email
        .sendInvoiceGenerated(
          String(user.email),
          {
            customerName: String(user.name || 'Customer'),
            orderId,
            invoiceNumber,
            customerInvoiceUrl: customerUrl,
            ...(dealerUrl ? { dealerInvoiceUrl: dealerUrl } : {}),
            ...(gstUrl ? { gstInvoiceUrl: gstUrl } : {}),
          },
          attachments,
        )
        .catch((err) => this.logger.error(`Invoice email failed for order ${orderId}: ${err.message}`));
    }

    this.logger.log(`Invoice ${invoiceNumber} generated for order ${orderId} (dealer=${isDealer})`);
    return { id: invoiceId, invoice_number: invoiceNumber, customer_invoice_url: customerUrl };
  }
}
