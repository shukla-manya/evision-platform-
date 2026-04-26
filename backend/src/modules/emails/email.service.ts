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

type EmailLayoutMeta = {
  email_title: string;
  preheader: string;
  /** Bottom border accent under header band */
  header_border_color?: string;
};

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
    const from = `"${this.config.get('EMAIL_FROM_NAME', 'E vision Pvt. Ltd.')}" <${this.config.get('EMAIL_FROM')}>`;
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
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  }

  brandDisplay(): string {
    return this.config.get<string>('PUBLIC_BRAND_NAME')?.trim() || 'E vision';
  }

  private supportEmail(): string {
    return String(this.config.get('EMAIL_FROM') || '').trim() || 'support@example.com';
  }

  private frontendUrl(): string {
    return String(this.config.get('FRONTEND_URL') || '').trim() || '#';
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private hrefAttr(url: string): string {
    return String(url).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Safe HTML table rows for optional electrician registration fields. */
  private electricianDetailRows(data: {
    skills?: string;
    address?: string;
    aadhar_url?: string;
    photo_url?: string;
  }): string {
    const rows: string[] = [];
    if (data.skills?.trim()) {
      rows.push(
        `<tr><td style="color:#94a3b8;font-size:13px;padding:8px 0;width:140px;vertical-align:top;">Skills</td><td style="color:#e2e8f0;font-size:14px;padding:8px 0;">${this.escapeHtml(data.skills.trim())}</td></tr>`,
      );
    }
    if (data.address?.trim()) {
      rows.push(
        `<tr><td style="color:#94a3b8;font-size:13px;padding:8px 0;width:140px;vertical-align:top;">Location</td><td style="color:#e2e8f0;font-size:14px;padding:8px 0;">${this.escapeHtml(data.address.trim())}</td></tr>`,
      );
    }
    if (data.aadhar_url?.trim()) {
      const u = this.hrefAttr(data.aadhar_url.trim());
      rows.push(
        `<tr><td style="color:#94a3b8;font-size:13px;padding:8px 0;width:140px;">Aadhar</td><td style="font-size:14px;padding:8px 0;"><a href="${u}" style="color:#3b82f6;text-decoration:none;">View document</a></td></tr>`,
      );
    }
    if (data.photo_url?.trim()) {
      const u = this.hrefAttr(data.photo_url.trim());
      rows.push(
        `<tr><td style="color:#94a3b8;font-size:13px;padding:8px 0;width:140px;">Photo</td><td style="font-size:14px;padding:8px 0;"><a href="${u}" style="color:#3b82f6;text-decoration:none;">View photo</a></td></tr>`,
      );
    }
    return rows.join('');
  }

  private invoiceOptionalRows(data: { dealerInvoiceUrl?: string; gstInvoiceUrl?: string }): {
    dealer_invoice_block: string;
    gst_invoice_block: string;
  } {
    const dealer = data.dealerInvoiceUrl?.trim();
    const gst = data.gstInvoiceUrl?.trim();
    const dealer_invoice_block = dealer
      ? `<tr><td colspan="2" style="padding:12px 0 0;border-top:1px solid #1e3a5f;"><p style="margin:0;color:#94a3b8;font-size:13px;">Dealer tax invoice</p><p style="margin:6px 0 0;"><a href="${this.hrefAttr(dealer)}" style="color:#60a5fa;font-size:14px;text-decoration:none;font-weight:600;">Download PDF</a></p></td></tr>`
      : '';
    const gst_invoice_block = gst
      ? `<tr><td colspan="2" style="padding:12px 0 0;border-top:1px solid #1e3a5f;"><p style="margin:0;color:#94a3b8;font-size:13px;">GST tax invoice</p><p style="margin:6px 0 0;"><a href="${this.hrefAttr(gst)}" style="color:#60a5fa;font-size:14px;text-decoration:none;font-weight:600;">Download PDF</a></p></td></tr>`
      : '';
    return { dealer_invoice_block, gst_invoice_block };
  }

  private renderEmail(
    fragmentName: string,
    fragmentVars: Record<string, string>,
    meta: EmailLayoutMeta,
  ): string {
    const mergedFragmentVars = { brand_name: this.brandDisplay(), ...fragmentVars };
    const fragment = this.interpolate(this.loadTemplate(fragmentName), mergedFragmentVars);
    const layout = this.loadTemplate('_layout');
    const year = String(new Date().getFullYear());
    return this.interpolate(layout, {
      email_title: meta.email_title,
      preheader: meta.preheader,
      body_html: fragment,
      brand_name: mergedFragmentVars.brand_name,
      support_email: this.supportEmail(),
      frontend_url: this.frontendUrl(),
      footer_year: year,
      header_border_color: meta.header_border_color || '#3b82f6',
    });
  }

  async sendAdminRegistered(superadminEmail: string, adminData: { shopName: string; ownerName: string; email: string; phone: string }) {
    const html = this.renderEmail(
      'admin-registered',
      {
        shop_name: adminData.shopName,
        owner_name: adminData.ownerName,
        admin_email: adminData.email,
        admin_phone: adminData.phone,
        dashboard_url: `${this.frontendUrl()}/super/shop-registrations`,
      },
      {
        email_title: 'New shop registration',
        preheader: `New shop registration: ${adminData.shopName} — action required in superadmin.`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: superadminEmail,
      to_role: 'superadmin',
      subject: `New shop registration: ${adminData.shopName}`,
      html,
      trigger_event: 'admin_registered',
    });
  }

  async sendAdminApproved(
    adminEmail: string,
    data: { ownerName: string; shopName: string; loginUrl: string; setupPasswordUrl: string },
  ) {
    const html = this.renderEmail(
      'admin-approved',
      {
        owner_name: data.ownerName,
        shop_name: data.shopName,
        login_url: data.loginUrl,
        setup_password_url: data.setupPasswordUrl,
      },
      {
        email_title: 'Your shop was approved',
        preheader: `${data.shopName} is approved — create your password to get started.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `Your shop "${data.shopName}" has been approved — ${this.brandDisplay()}`,
      html,
      trigger_event: 'admin_approved',
    });
  }

  async sendAdminRejected(adminEmail: string, data: { ownerName: string; shopName: string; reason: string }) {
    const html = this.renderEmail(
      'admin-rejected',
      {
        owner_name: this.escapeHtml(data.ownerName),
        shop_name: this.escapeHtml(data.shopName),
        reject_reason: this.escapeHtml(data.reason),
        support_email: this.supportEmail(),
      },
      {
        email_title: 'Registration update',
        preheader: `Update on your application for ${data.shopName}.`,
        header_border_color: '#ef4444',
      },
    );
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `Update on your registration — ${data.shopName}`,
      html,
      trigger_event: 'admin_rejected',
    });
  }

  async sendElectricianRegistered(
    superadminEmail: string,
    data: {
      name: string;
      email: string;
      phone: string;
      skills?: string;
      address?: string;
      aadhar_url?: string;
      photo_url?: string;
    },
  ) {
    const detail_rows = this.electricianDetailRows({
      skills: data.skills,
      address: data.address,
      aadhar_url: data.aadhar_url,
      photo_url: data.photo_url,
    });
    const html = this.renderEmail(
      'electrician-registered',
      {
        electrician_name: data.name,
        electrician_email: data.email,
        electrician_phone: data.phone,
        detail_rows,
        review_url: `${this.frontendUrl()}/super/technicians`,
      },
      {
        email_title: 'New technician registration',
        preheader: `Technician ${data.name} submitted an application — review in superadmin.`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: superadminEmail,
      to_role: 'superadmin',
      subject: `New technician registration: ${data.name}`,
      html,
      trigger_event: 'electrician_registered',
    });
  }

  async sendElectricianApproved(electricianEmail: string, data: { name: string }) {
    const brand = this.brandDisplay();
    const html = this.renderEmail(
      'electrician-approved',
      {
        electrician_name: data.name,
        brand_name: brand,
        login_url: `${this.frontendUrl()}/electrician/login`,
      },
      {
        email_title: 'Technician account approved',
        preheader: `${brand}: your technician account is approved. Sign in to get started.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: electricianEmail,
      to_role: 'electrician',
      subject: `Welcome to ${brand} — your technician account is approved`,
      html,
      trigger_event: 'electrician_approved',
    });
  }

  async sendDealerGstVerified(dealerEmail: string, data: { name: string }) {
    const brand = this.brandDisplay();
    const html = this.renderEmail(
      'dealer-gst-verified',
      {
        dealer_name: data.name,
        brand_name: brand,
        shop_url: `${this.frontendUrl()}/`,
      },
      {
        email_title: 'Dealer pricing active',
        preheader: `${brand}: GST verified — wholesale prices on the full catalogue and dealer checkout are ready.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: dealerEmail,
      to_role: 'dealer',
      subject: `GST verified — dealer pricing & checkout are active — ${brand}`,
      html,
      trigger_event: 'dealer_gst_verified',
    });
  }

  async sendElectricianRejected(electricianEmail: string, data: { name: string; reason: string }) {
    const brand = this.brandDisplay();
    const support =
      this.config.get<string>('TECHNICIAN_SUPPORT_EMAIL')?.trim() || this.supportEmail();
    const html = this.renderEmail(
      'electrician-rejected',
      {
        electrician_name: this.escapeHtml(data.name),
        reason: this.escapeHtml(data.reason),
        brand_name: brand,
        support_email: support,
      },
      {
        email_title: 'Technician application update',
        preheader: `Your ${brand} technician application could not be approved.`,
        header_border_color: '#ef4444',
      },
    );
    await this.send({
      to: electricianEmail,
      to_role: 'electrician',
      subject: `Your ${brand} technician application — update`,
      html,
      trigger_event: 'electrician_rejected',
    });
  }

  async sendNearbyOrderAlertToElectrician(
    electricianEmail: string,
    data: { electricianName: string; productName: string; distanceKm: number },
  ) {
    const html = this.renderEmail(
      'electrician-nearby-order-alert',
      {
        electrician_name: this.escapeHtml(data.electricianName),
        product_name: this.escapeHtml(data.productName),
        distance_km: String(data.distanceKm.toFixed(2)),
      },
      {
        email_title: 'Order near you',
        preheader: `New ${data.productName} order about ${data.distanceKm.toFixed(1)} km away.`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: electricianEmail,
      to_role: 'electrician',
      subject: `New ${data.productName} order near you`,
      html,
      trigger_event: 'electrician_nearby_order_alert',
    });
  }

  async sendServiceBookingRequestToElectrician(
    electricianEmail: string,
    data: { electricianName: string; issue: string; expiresAt: string },
  ) {
    const html = this.renderEmail(
      'service-booking-request-electrician',
      {
        electrician_name: this.escapeHtml(data.electricianName),
        issue: this.escapeHtml(data.issue),
        expires_at: data.expiresAt,
      },
      {
        email_title: 'New service booking',
        preheader: 'A customer requested a service visit — respond before it expires.',
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: electricianEmail,
      to_role: 'electrician',
      subject: 'New service booking request',
      html,
      trigger_event: 'service_booking_request',
    });
  }

  async sendClientBookingPending(customerEmail: string, data: { customerName: string; electricianName: string }) {
    const html = this.renderEmail(
      'service-booking-pending-client',
      {
        customer_name: data.customerName,
        electrician_name: data.electricianName,
      },
      {
        email_title: 'Booking request sent',
        preheader: `Waiting for ${data.electricianName} to confirm your service request.`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: 'Service booking request sent',
      html,
      trigger_event: 'service_booking_pending',
    });
  }

  async sendClientBookingAccepted(
    customerEmail: string,
    data: { customerName: string; electricianName: string; electricianPhone: string },
  ) {
    const html = this.renderEmail(
      'service-booking-accepted-client',
      {
        customer_name: data.customerName,
        electrician_name: data.electricianName,
        electrician_phone: data.electricianPhone,
      },
      {
        email_title: 'Booking confirmed',
        preheader: `${data.electricianName} accepted your service booking.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: 'Service booking confirmed',
      html,
      trigger_event: 'service_booking_accepted',
    });
  }

  async sendClientBookingDeclined(customerEmail: string, data: { customerName: string; electricianName: string }) {
    const html = this.renderEmail(
      'service-booking-declined-client',
      {
        customer_name: data.customerName,
        electrician_name: data.electricianName,
      },
      {
        email_title: 'Booking declined',
        preheader: `${data.electricianName} declined your booking request.`,
        header_border_color: '#ef4444',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: 'Electrician declined your booking',
      html,
      trigger_event: 'service_booking_declined',
    });
  }

  async sendClientBookingExpired(customerEmail: string, data: { customerName: string }) {
    const html = this.renderEmail(
      'service-booking-expired-client',
      {
        customer_name: data.customerName,
      },
      {
        email_title: 'Booking expired',
        preheader: 'Your service booking request timed out.',
        header_border_color: '#f59e0b',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: 'Service booking expired',
      html,
      trigger_event: 'service_booking_expired',
    });
  }

  async sendClientJobStatusUpdate(
    customerEmail: string,
    data: { customerName: string; electricianName: string; status: string },
  ) {
    const html = this.renderEmail(
      'service-job-status-client',
      {
        customer_name: this.escapeHtml(data.customerName),
        electrician_name: this.escapeHtml(data.electricianName),
        status: this.escapeHtml(data.status),
      },
      {
        email_title: 'Service job update',
        preheader: `Job update: ${data.status}`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Service job update: ${data.status}`,
      html,
      trigger_event: 'service_job_status_update',
    });
  }

  async sendClientReviewPrompt(customerEmail: string, data: { customerName: string; electricianName: string }) {
    const html = this.renderEmail(
      'service-review-prompt-client',
      {
        customer_name: data.customerName,
        electrician_name: data.electricianName,
        reviews_url: `${this.frontendUrl()}/reviews`,
      },
      {
        email_title: 'Leave a review',
        preheader: `How was your visit with ${data.electricianName}?`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: 'How was your service experience?',
      html,
      trigger_event: 'service_review_prompt',
    });
  }

  async sendElectricianReviewReceived(
    electricianEmail: string,
    data: { electricianName: string; rating: number; comment: string },
  ) {
    const html = this.renderEmail(
      'electrician-review-received',
      {
        electrician_name: this.escapeHtml(data.electricianName),
        rating: String(data.rating),
        comment: this.escapeHtml(data.comment || 'No comment provided'),
      },
      {
        email_title: 'New review',
        preheader: `You received a ${data.rating}-star review.`,
        header_border_color: '#3b82f6',
      },
    );
    await this.send({
      to: electricianEmail,
      to_role: 'electrician',
      subject: 'You received a new review',
      html,
      trigger_event: 'electrician_review_received',
    });
  }

  async sendPaymentConfirmedCustomer(
    customerEmail: string,
    data: { customerName: string; orderGroupId: string; amount: number },
  ) {
    const html = this.renderEmail(
      'payment-confirmed',
      {
        customer_name: data.customerName,
        order_group_id: data.orderGroupId,
        amount: String(data.amount.toFixed(2)),
        orders_url: `${this.frontendUrl()}/orders`,
      },
      {
        email_title: 'Payment confirmed',
        preheader: `Order ${data.orderGroupId} — payment received.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Payment confirmed — order ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_confirmed',
    });
  }

  async sendPaymentConfirmedAdmin(adminEmail: string, data: { shopName: string; orderGroupId: string; amount: number }) {
    const html = this.renderEmail(
      'payment-confirmed-admin',
      {
        shop_name: data.shopName,
        order_group_id: data.orderGroupId,
        amount: String(data.amount.toFixed(2)),
        admin_orders_url: `${this.frontendUrl()}/admin/orders`,
      },
      {
        email_title: 'New paid order',
        preheader: `New paid order ${data.orderGroupId} for ${data.shopName}.`,
        header_border_color: '#10b981',
      },
    );
    await this.send({
      to: adminEmail,
      to_role: 'admin',
      subject: `New paid order — ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_confirmed_admin',
    });
  }

  async sendPaymentFailedCustomer(
    customerEmail: string,
    data: { customerName: string; orderGroupId: string; reason: string },
  ) {
    const html = this.renderEmail(
      'payment-failed',
      {
        customer_name: this.escapeHtml(data.customerName),
        order_group_id: this.escapeHtml(data.orderGroupId),
        reason: this.escapeHtml(data.reason),
        retry_url: `${this.frontendUrl()}/cart`,
      },
      {
        email_title: 'Payment failed',
        preheader: `Payment failed for order ${data.orderGroupId}.`,
        header_border_color: '#ef4444',
      },
    );
    await this.send({
      to: customerEmail,
      to_role: 'customer',
      subject: `Payment failed — order ${data.orderGroupId}`,
      html,
      trigger_event: 'payment_failed',
    });
  }

  async sendOrderCancelled(toEmail: string, toRole: 'customer' | 'admin', data: { recipientName: string; orderGroupId: string }) {
    const html = this.renderEmail(
      'order-cancelled',
      {
        recipient_name: data.recipientName,
        order_group_id: data.orderGroupId,
        support_email: this.supportEmail(),
      },
      {
        email_title: 'Order cancelled',
        preheader: `Order ${data.orderGroupId} was cancelled.`,
        header_border_color: '#f59e0b',
      },
    );
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
    const html = this.renderEmail(
      'order-shipped',
      {
        customer_name: data.customerName,
        order_id: data.orderId,
        tracking_number: data.trackingNumber,
        courier_name: data.courierName,
        tracking_url: data.trackingUrl,
      },
      {
        email_title: 'Order shipped',
        preheader: `Your order ${data.orderId} is on the way.`,
        header_border_color: '#3b82f6',
      },
    );
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
    const html = this.renderEmail(
      'order-stage-update',
      {
        customer_name: data.customerName,
        order_id: data.orderId,
        stage: stageLabel,
        tracking_number: data.trackingNumber,
        courier_name: data.courierName,
        orders_url: `${this.frontendUrl()}/orders`,
      },
      {
        email_title: `Order update: ${stageLabel}`,
        preheader: `${data.orderId} — ${stageLabel}.`,
        header_border_color: '#3b82f6',
      },
    );
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
    const { dealer_invoice_block, gst_invoice_block } = this.invoiceOptionalRows({
      dealerInvoiceUrl: data.dealerInvoiceUrl,
      gstInvoiceUrl: data.gstInvoiceUrl,
    });
    const html = this.renderEmail(
      'invoice-generated',
      {
        customer_name: data.customerName,
        order_id: data.orderId,
        invoice_number: data.invoiceNumber,
        customer_invoice_url: data.customerInvoiceUrl,
        orders_url: `${this.frontendUrl()}/orders`,
        dealer_invoice_block,
        gst_invoice_block,
      },
      {
        email_title: `Invoice ${data.invoiceNumber}`,
        preheader: `Invoice ${data.invoiceNumber} for order ${data.orderId} is ready.`,
        header_border_color: '#3b82f6',
      },
    );
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
