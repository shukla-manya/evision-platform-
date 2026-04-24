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
    const templatePath = path.join(__dirname, 'templates', `${name}.html`);
    return fs.readFileSync(templatePath, 'utf-8');
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
}
