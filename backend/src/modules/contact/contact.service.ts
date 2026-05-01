import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../emails/email.service';
import { SubmitContactMessageDto } from './dto/submit-contact-message.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async submitMessage(dto: SubmitContactMessageDto) {
    const first = dto.first_name.trim();
    const last = dto.last_name.trim();
    const fromEmail = dto.email.trim().toLowerCase();
    const message = dto.message.trim();
    const fromName = `${first} ${last}`.trim() || fromEmail;
    const staffEmail = this.email.contactFormStaffInbox();

    const staff = await this.email.sendContactFormToStaff({
      staffEmail,
      replyTo: fromEmail,
      fromName,
      message,
    });
    if (!staff.ok) {
      throw new ServiceUnavailableException(
        'We could not send your message right now. Please try again in a few minutes or call our support line.',
      );
    }

    const greetingName = first || fromName;
    const ack = await this.email.sendContactFormConfirmation({
      toEmail: fromEmail,
      greetingName,
      firstName: first,
      lastName: last,
      messagePreview: message,
    });
    if (!ack.ok) {
      throw new ServiceUnavailableException(
        'Your message was received by our team, but we could not send the confirmation email. You may try again or contact us by phone.',
      );
    }

    return {
      ok: true,
      greeting_name: greetingName,
      first_name: first,
      last_name: last,
      email: fromEmail,
      message,
    };
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    const em = dto.email.trim().toLowerCase();
    const marketingInbox = this.email.newsletterInbox();

    const staff = await this.email.sendNewsletterRequest({
      toEmail: marketingInbox,
      subscriberEmail: em,
    });
    if (!staff.ok) {
      throw new ServiceUnavailableException('Could not submit your subscription right now. Please try again later.');
    }

    const superadminEmail = this.config.get<string>('SUPERADMIN_EMAIL')?.trim().toLowerCase();
    if (superadminEmail && superadminEmail !== marketingInbox.toLowerCase()) {
      const sa = await this.email.sendNewsletterSuperadminNotify({
        toEmail: superadminEmail,
        subscriberEmail: em,
      });
      if (!sa.ok) {
        this.logger.warn(
          `Newsletter signup for ${em} was emailed to marketing, but superadmin notify failed: ${sa.error}`,
        );
      }
    }

    const ack = await this.email.sendNewsletterConfirmation(em);
    if (!ack.ok) {
      throw new ServiceUnavailableException(
        'Your subscription was recorded, but we could not send the thank-you email. Please try again or contact support.',
      );
    }

    return { ok: true, email: em };
  }
}
