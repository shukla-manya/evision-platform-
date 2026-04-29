import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { EmailService } from '../emails/email.service';
import { SubmitContactMessageDto } from './dto/submit-contact-message.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class ContactService {
  constructor(private readonly email: EmailService) {}

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
    const inbox = this.email.newsletterInbox();

    const staff = await this.email.sendNewsletterRequest({
      toEmail: inbox,
      subscriberEmail: em,
    });
    if (!staff.ok) {
      throw new ServiceUnavailableException('Could not submit your subscription right now. Please try again later.');
    }

    const ack = await this.email.sendNewsletterConfirmation(em);
    if (!ack.ok) {
      throw new ServiceUnavailableException(
        'Your subscription request was sent, but we could not email you a confirmation.',
      );
    }

    return { ok: true, email: em };
  }
}
