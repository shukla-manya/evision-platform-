import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DynamoService } from '../../common/dynamo/dynamo.service';

export interface SendEmailOptions {
  to: string;
  to_role: string;
  subject: string;
  html: string;
  trigger_event: string;
  attachments?: any[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private config: ConfigService,
    private dynamo: DynamoService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get('SMTP_USER'),
        pass: config.get('SMTP_PASS'),
      },
    });
  }

  async send(opts: SendEmailOptions): Promise<void> {
    const from = `"${this.config.get('EMAIL_FROM_NAME', 'E Vision Pvt. Ltd.')}" <${this.config.get('EMAIL_FROM')}>`;
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | null = null;

    try {
      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        attachments: opts.attachments,
      });
      this.logger.log(`Email sent [${opts.trigger_event}] → ${opts.to}`);
    } catch (err) {
      status = 'failed';
      errorMessage = err.message;
      this.logger.error(`Email failed [${opts.trigger_event}] → ${opts.to}: ${err.message}`);
    }

    // Always log to DynamoDB
    await this.dynamo.put(this.dynamo.tableName('email_logs'), {
      id: uuidv4(),
      trigger_event: opts.trigger_event,
      to_email: opts.to,
      to_role: opts.to_role,
      subject: opts.subject,
      status,
      error_message: errorMessage,
      sent_at: new Date().toISOString(),
    });
  }

  // ── Template helpers ──────────────────────────────────────────────────────
  private loadTemplate(name: string): string {
    const candidates = [
      path.join(__dirname, 'templates', `${name}.html`),
      path.join(process.cwd(), 'src/modules/emails/templates', `${name}.html`),
      path.join(process.cwd(), 'dist/modules/emails/templates', `${name}.html`),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    }
    throw new Error(`Email template not found: ${name}`);
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || '');
  }

  async sendAdminRegistered(superadminEmail: string, adminData: { shopName: string; ownerName: string; email: string; phone: string }) {
    const html = this.interpolate(this.loadTemplate('admin-registered'), {
      shop_name: adminData.shopName,
      owner_name: adminData.ownerName,
      admin_email: adminData.email,
      admin_phone: adminData.phone,
      dashboard_url: `${this.config.get('FRONTEND_URL')}/superadmin/admins`,
    });
    await this.send({
      to: superadminEmail,
      to_role: 'superadmin',
      subject: `New Admin Registration: ${adminData.shopName}`,
      html,
      trigger_event: 'admin_registered',
    });
  }

  async sendAdminApproved(adminEmail: string, data: { ownerName: string; shopName: string; loginUrl: string }) {
    const html = this.interpolate(this.loadTemplate('admin-approved'), {
      owner_name: data.ownerName,
      shop_name: data.shopName,
      login_url: data.loginUrl,
    });
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `🎉 Your Shop "${data.shopName}" has been approved — E Vision`,
      html,
      trigger_event: 'admin_approved',
    });
  }

  async sendAdminRejected(adminEmail: string, data: { ownerName: string; shopName: string; reason: string }) {
    const html = this.interpolate(this.loadTemplate('admin-rejected'), {
      owner_name: data.ownerName,
      shop_name: data.shopName,
      reject_reason: data.reason,
      support_email: this.config.get('EMAIL_FROM'),
    });
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `Update on your E Vision registration — ${data.shopName}`,
      html,
      trigger_event: 'admin_rejected',
    });
  }

  async sendPaymentConfirmedCustomer(
    customerEmail: string,
    data: { customerName: string; orderGroupId: string; amount: number },
  ) {
    const html = this.interpolate(this.loadTemplate('payment-confirmed'), {
      customer_name: data.customerName,
      order_group_id: data.orderGroupId,
      amount: String(data.amount.toFixed(2)),
      orders_url: `${this.config.get('FRONTEND_URL')}/orders`,
    });
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Payment confirmed — order ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_confirmed',
    });
  }

  async sendPaymentConfirmedAdmin(
    adminEmail: string,
    data: { shopName: string; orderGroupId: string; amount: number },
  ) {
    const html = this.interpolate(this.loadTemplate('payment-confirmed'), {
      customer_name: data.shopName,
      order_group_id: data.orderGroupId,
      amount: String(data.amount.toFixed(2)),
      orders_url: `${this.config.get('FRONTEND_URL')}/admin/orders`,
    });
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `New paid order received — ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_confirmed',
    });
  }

  async sendPaymentFailedCustomer(
    customerEmail: string,
    data: { customerName: string; orderGroupId: string; reason: string },
  ) {
    const html = this.interpolate(this.loadTemplate('payment-failed'), {
      customer_name: data.customerName,
      order_group_id: data.orderGroupId,
      reason: data.reason,
      retry_url: `${this.config.get('FRONTEND_URL')}/cart`,
    });
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Payment failed — order ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_failed',
    });
  }

  async sendOrderCancelled(
    toEmail: string,
    toRole: 'customer' | 'admin',
    data: { recipientName: string; orderGroupId: string },
  ) {
    const html = this.interpolate(this.loadTemplate('order-cancelled'), {
      recipient_name: data.recipientName,
      order_group_id: data.orderGroupId,
      support_email: this.config.get('EMAIL_FROM'),
    });
    await this.send({
      to: toEmail,
      to_role: toRole,
      subject: `Order cancelled — ${data.orderGroupId}`,
      html,
      trigger_event: 'order_cancelled',
    });
  }

  async sendOrderShipped(
    customerEmail: string,
    data: {
      customerName: string;
      orderId: string;
      trackingNumber: string;
      courierName: string;
      trackingUrl: string;
    },
  ) {
    const html = this.interpolate(this.loadTemplate('order-shipped'), {
      customer_name: data.customerName,
      order_id: data.orderId,
      tracking_number: data.trackingNumber,
      courier_name: data.courierName,
      tracking_url: data.trackingUrl,
    });
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Your order has been shipped — ${data.orderId}`,
      html,
      trigger_event: 'order_shipped',
    });
  }

  async sendOrderStageUpdate(
    customerEmail: string,
    data: {
      customerName: string;
      orderId: string;
      stage: 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
      trackingNumber: string;
      courierName: string;
    },
  ) {
    const stageLabel = {
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
    }[data.stage];
    const html = this.interpolate(this.loadTemplate('order-stage-update'), {
      customer_name: data.customerName,
      order_id: data.orderId,
      stage: stageLabel,
      tracking_number: data.trackingNumber,
      courier_name: data.courierName,
      orders_url: `${this.config.get('FRONTEND_URL')}/orders`,
    });
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Order update (${stageLabel}) — ${data.orderId}`,
      html,
      trigger_event: data.stage,
    });
  }

  async sendInvoiceGenerated(
    customerEmail: string,
    data: {
      customerName: string;
      orderId: string;
      invoiceNumber: string;
      customerInvoiceUrl: string;
      dealerInvoiceUrl?: string;
      gstInvoiceUrl?: string;
    },
    attachments: Array<{ filename: string; content: Buffer; contentType: string }>,
  ) {
    const html = this.interpolate(this.loadTemplate('invoice-generated'), {
      customer_name: data.customerName,
      order_id: data.orderId,
      invoice_number: data.invoiceNumber,
      customer_invoice_url: data.customerInvoiceUrl,
      dealer_invoice_url: data.dealerInvoiceUrl || '',
      gst_invoice_url: data.gstInvoiceUrl || '',
      orders_url: `${this.config.get('FRONTEND_URL')}/orders`,
    });
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Invoice generated — ${data.invoiceNumber}`,
      html,
      trigger_event: 'invoice_generated',
      attachments,
    });
  }
}
